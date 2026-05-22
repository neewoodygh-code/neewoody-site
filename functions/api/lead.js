export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers for same-origin form posts
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://neewoodygh.com',
  };

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid request body' }), { status: 400, headers });
    }

    const { name, phone, email, project_type, message, dimensions, budget, location, _gotcha } = body;

    // Honeypot — if filled, silently discard (bot submission)
    if (_gotcha) {
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // Required field validation
    const missing = [];
    if (!name?.trim())         missing.push('name');
    if (!phone?.trim())        missing.push('phone');
    if (!project_type?.trim()) missing.push('project_type');
    if (!message?.trim())      missing.push('message');

    if (missing.length) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields', fields: missing }),
        { status: 422, headers }
      );
    }

    // Build lead record
    const lead = {
      id: `lead-${Date.now()}`,
      created_at: new Date().toISOString(),
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      project_type: project_type.trim(),
      dimensions: dimensions?.trim() || null,
      budget: budget?.trim() || null,
      location: location?.trim() || null,
      message: message.trim(),
      source: 'contact_form',
    };

    // Save to KV — appends to nwd-leads array
    // Requires: bind neewoody-dispatch KV namespace as "KV" in Cloudflare Pages settings
    if (env.KV) {
      try {
        const existing = JSON.parse(await env.KV.get('nwd-leads') || '[]');
        existing.unshift(lead); // newest first
        await env.KV.put('nwd-leads', JSON.stringify(existing));
      } catch (kvErr) {
        console.error('KV write failed:', kvErr);
        // Don't fail the request if KV is unavailable — still return success
      }
    }

    // Send Web Push to admin if subscription and VAPID keys are available
    // (Admin subscription stored as sub-cr01 in KV)
    if (env.KV && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      try {
        const subRaw = await env.KV.get('sub-cr01');
        if (subRaw) {
          const sub = JSON.parse(subRaw);
          const payload = JSON.stringify({
            title: `New lead — ${lead.project_type}`,
            body: `${lead.name} · ${lead.phone}`,
            url: '/dispatch.html',
          });
          // Push send is best-effort — failures don't affect the response
          await sendWebPush(sub, payload, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY).catch(() => {});
        }
      } catch {
        // Non-fatal
      }
    }

    return new Response(JSON.stringify({ ok: true, id: lead.id }), { headers });

  } catch (err) {
    console.error('Lead handler error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error — please try WhatsApp instead' }),
      { status: 500, headers }
    );
  }
}

// Basic Web Push helper (VAPID JWT generation via Web Crypto API)
async function sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKey) {
  const endpoint = subscription.endpoint;
  const origin = new URL(endpoint).origin;
  const audience = origin;
  const subject = 'mailto:neewoodygh@gmail.com';
  const expiration = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claims = btoa(JSON.stringify({ aud: audience, exp: expiration, sub: subject })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${header}.${claims}`;

  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const signatureBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signingInput}.${signature}`;

  const authHeader = `vapid t=${jwt}, k=${vapidPublicKey}`;

  const encrypted = await encryptPayload(payload, subscription);

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: encrypted,
  });
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - str.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0)).buffer;
}

async function encryptPayload(payload, subscription) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeys.publicKey);
  const clientPublicKeyBytes = base64UrlDecode(subscription.keys.p256dh);
  const clientPublicKey = await crypto.subtle.importKey('raw', clientPublicKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecret = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeys.privateKey, 256);
  const authBytes = base64UrlDecode(subscription.keys.auth);
  const prk = await crypto.subtle.importKey('raw', await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: encoder.encode('Content-Encoding: auth\0') },
    await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']),
    256
  ), 'HKDF', false, ['deriveBits']);
  const keyInfo = concat(encoder.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([0]), new Uint8Array(serverPublicKey), new Uint8Array(clientPublicKeyBytes));
  const nonceInfo = concat(encoder.encode('Content-Encoding: nonce\0'), new Uint8Array([0]), new Uint8Array(serverPublicKey), new Uint8Array(clientPublicKeyBytes));
  const contentKey = await crypto.subtle.importKey('raw', await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prk, 128), { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = (await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prk, 96));
  const plaintext = concat(encoder.encode(payload), new Uint8Array([2]));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, contentKey, plaintext);
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  const serverPublicKeyLen = new Uint8Array([serverPublicKey.byteLength]);
  return concat(salt, recordSize, serverPublicKeyLen, new Uint8Array(serverPublicKey), new Uint8Array(ciphertext));
}

function concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(new Uint8Array(a instanceof ArrayBuffer ? a : a.buffer), offset); offset += a.byteLength; }
  return out;
}
