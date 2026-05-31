// Neewoody Dispatch — Cloudflare Worker
// KV data storage + Web Push notifications (RFC 8291 aes128gcm) + Expo push

const ALLOWED_KEYS = ['nwd-crew', 'nwd-tools', 'nwd-jobs', 'nwd-damage', 'nwd-quotes', 'nwd-overhead', 'nwd-leads', 'nwd-config'];
const VAPID_SUBJECT = 'mailto:neewoodygh@gmail.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-NWD-Key',
};

function b64uDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function b64uEncode(buf) {
  const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function concat(...arrays) {
  const parts = arrays.map(a => a instanceof Uint8Array ? a : new Uint8Array(a));
  const total = parts.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of parts) { out.set(a, off); off += a.length; }
  return out;
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ── Web Push (existing, untouched) ────────────────────────────────────

async function makeVAPIDAuth(endpoint, env) {
  const url = new URL(endpoint);
  const enc = new TextEncoder();
  const header  = b64uEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64uEncode(enc.encode(JSON.stringify({
    aud: `${url.protocol}//${url.host}`,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: VAPID_SUBJECT,
  })));
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE, x: env.VAPID_X, y: env.VAPID_Y, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`)
  );
  return `vapid t=${header}.${payload}.${b64uEncode(sig)},k=${env.VAPID_PUBLIC}`;
}

async function encryptPayload(subscription, message) {
  const enc = new TextEncoder();
  const subPub    = b64uDecode(subscription.keys.p256dh);
  const authSec   = b64uDecode(subscription.keys.auth);
  const salt      = crypto.getRandomValues(new Uint8Array(16));

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const ephPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));

  const subKey = await crypto.subtle.importKey(
    'raw', subPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subKey }, ephemeral.privateKey, 256
  );

  const ikmInfo = concat(enc.encode('WebPush: info\x00'), subPub, ephPubRaw);
  const ikmBase = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']);
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSec, info: ikmInfo }, ikmBase, 256
  );
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);

  const cek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm\x00') },
    ikmKey, 128
  );
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce\x00') },
    ikmKey, 96
  );

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    concat(enc.encode(message), new Uint8Array([2]))
  );

  const header = new Uint8Array(21 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(ephPubRaw, 21);
  return concat(header, new Uint8Array(ciphertext));
}

async function sendWebPush(subscription, title, body, env) {
  try {
    const payload   = JSON.stringify({ title, body, icon: '/icon-192.png' });
    const encrypted = await encryptPayload(subscription, payload);
    const auth      = await makeVAPIDAuth(subscription.endpoint, env);
    await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization':    auth,
        'TTL':              '86400',
      },
      body: encrypted,
    });
  } catch (e) {
    console.error('Web Push failed:', e.message);
  }
}

// ── Expo Push (new) ───────────────────────────────────────────────────

async function sendExpoPush(expoToken, title, body) {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify({
        to:    expoToken,
        title,
        body:  body || '',
        sound: 'default',
        data:  { source: 'neewoody-dispatch' },
      }),
    });
    const result = await res.json();
    if (result.data?.status === 'error') {
      console.error('Expo Push error:', result.data.message);
    }
  } catch (e) {
    console.error('Expo Push failed:', e.message);
  }
}

// ── Unified notify — sends via whichever channel exists ───────────────

async function notifyCrew(env, crewId, title, body) {
  // Web Push (browser)
  const webRaw = await env.NEEWOODY_KV.get(`sub-${crewId}`);
  if (webRaw) {
    await sendWebPush(JSON.parse(webRaw), title, body, env);
  }
  // Expo Push (native app)
  const expoToken = await env.NEEWOODY_KV.get(`expo-${crewId}`);
  if (expoToken) {
    await sendExpoPush(expoToken, title, body);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const parts = url.pathname.split('/').filter(Boolean).slice(1);
    const route = parts[0];

    // Public endpoints — no API key required
    if (route === 'lead' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Origin': '*' } });
    }

    if (route === 'lead' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body || !body.name || !body.phone || !body.message) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      if (body._gotcha) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const lead = {
        id: crypto.randomUUID().slice(0, 8).toUpperCase(),
        ...body,
        submittedAt: new Date().toISOString(),
        status: 'new',
      };
      const existing = await env.NEEWOODY_KV.get('nwd-leads');
      const leads = existing ? JSON.parse(existing) : [];
      leads.unshift(lead);
      await env.NEEWOODY_KV.put('nwd-leads', JSON.stringify(leads));
      // Notify admin via both channels
      await notifyCrew(env, 'cr01', `New enquiry: ${lead.name}`, `${lead.project_type || 'Project'} · ${lead.phone}`);
      return new Response(JSON.stringify({ ok: true, id: lead.id }), {
        headers: { ...cors, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── Public: GET /api/posts  (list / filter) ──────────────────────
    if (route === 'posts' && request.method === 'GET' && !parts[1]) {
      const raw  = await env.NEEWOODY_KV.get('nwd-posts');
      let posts  = raw ? JSON.parse(raw) : [];
      const page     = url.searchParams.get('page');
      const featured = url.searchParams.get('featured');
      if (page)             posts = posts.filter(p => Array.isArray(p.pages) && p.pages.includes(page));
      if (featured === '1') posts = posts.filter(p => p.featured);
      posts = posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return json({ ok: true, posts });
    }

    // ── Public: GET /api/posts/:id ────────────────────────────────────
    if (route === 'posts' && request.method === 'GET' && parts[1]) {
      const raw   = await env.NEEWOODY_KV.get('nwd-posts');
      const posts = raw ? JSON.parse(raw) : [];
      const post  = posts.find(p => p.id === parts[1]);
      if (!post) return json({ error: 'Not found' }, 404);
      return json({ ok: true, post });
    }

    // ── Public: GET /api/media/** — serve image from R2 ──────────────
    if (route === 'media' && request.method === 'GET') {
      if (!env.MEDIA) return new Response('MEDIA not bound', { status: 503, headers: cors });
      const key = parts.slice(1).join('/');
      if (!key)  return new Response('Not found', { status: 404, headers: cors });
      const obj = await env.MEDIA.get(key);
      if (!obj)  return new Response('Not found', { status: 404, headers: cors });
      return new Response(obj.body, {
        headers: {
          ...cors,
          'Content-Type':  obj.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag':          obj.etag,
        },
      });
    }

    // All other routes require API key
    if (request.headers.get('X-NWD-Key') !== env.NWD_API_KEY) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // ── GET /api/leads — return all leads, newest first ───────────────
    if (route === 'leads' && request.method === 'GET') {
      const raw = await env.NEEWOODY_KV.get('nwd-leads');
      const leads = raw ? JSON.parse(raw) : [];
      leads.sort((a, b) => {
        const ta = new Date(a.submittedAt || a.created_at || a.timestamp || 0).getTime();
        const tb = new Date(b.submittedAt || b.created_at || b.timestamp || 0).getTime();
        return tb - ta;
      });
      return json(leads);
    }

    // ── POST /api/posts — create ──────────────────────────────────────
    if (route === 'posts' && request.method === 'POST' && parts[1] !== 'upload') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const { title, category, location, writeup, images, pages, date, featured } = body;
      if (!title?.trim())    return json({ error: 'title required' }, 422);
      if (!category?.trim()) return json({ error: 'category required' }, 422);
      const post = {
        id:         `post-${Date.now()}`,
        title:      title.trim(),
        category:   category.trim(),
        location:   location?.trim()  || null,
        writeup:    writeup?.trim()   || null,
        images:     Array.isArray(images) ? images : [],
        pages:      Array.isArray(pages)  ? pages  : [],
        date:       date || new Date().toISOString().slice(0, 10),
        featured:   featured === true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const raw   = await env.NEEWOODY_KV.get('nwd-posts');
      const posts = raw ? JSON.parse(raw) : [];
      posts.unshift(post);
      await env.NEEWOODY_KV.put('nwd-posts', JSON.stringify(posts));
      return json({ ok: true, post }, 201);
    }

    // ── PUT /api/posts/:id — update ───────────────────────────────────
    if (route === 'posts' && request.method === 'PUT' && parts[1]) {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const raw   = await env.NEEWOODY_KV.get('nwd-posts');
      const posts = raw ? JSON.parse(raw) : [];
      const idx   = posts.findIndex(p => p.id === parts[1]);
      if (idx === -1) return json({ error: 'Not found' }, 404);
      const { title, category, location, writeup, images, pages, date, featured } = body;
      const prev = posts[idx];
      posts[idx] = {
        ...prev,
        ...(title    !== undefined && { title:    title.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(writeup  !== undefined && { writeup:  writeup?.trim()  || null }),
        ...(images   !== undefined && { images:   Array.isArray(images) ? images : prev.images }),
        ...(pages    !== undefined && { pages:    Array.isArray(pages)  ? pages  : prev.pages }),
        ...(date     !== undefined && { date }),
        ...(featured !== undefined && { featured: featured === true }),
        updated_at: new Date().toISOString(),
      };
      await env.NEEWOODY_KV.put('nwd-posts', JSON.stringify(posts));
      return json({ ok: true, post: posts[idx] });
    }

    // ── DELETE /api/posts/:id ─────────────────────────────────────────
    if (route === 'posts' && request.method === 'DELETE' && parts[1]) {
      const raw   = await env.NEEWOODY_KV.get('nwd-posts');
      const posts = raw ? JSON.parse(raw) : [];
      const idx   = posts.findIndex(p => p.id === parts[1]);
      if (idx === -1) return json({ error: 'Not found' }, 404);
      const [removed] = posts.splice(idx, 1);
      if (env.MEDIA && Array.isArray(removed.images)) {
        await Promise.allSettled(
          removed.images
            .map(u => { const m = u.match(/\/api\/media\/(.+)$/); return m ? env.MEDIA.delete(m[1]) : null; })
            .filter(Boolean)
        );
      }
      await env.NEEWOODY_KV.put('nwd-posts', JSON.stringify(posts));
      return json({ ok: true, id: removed.id });
    }

    // ── POST /api/posts/upload — upload image to R2 ───────────────────
    if (route === 'posts' && parts[1] === 'upload' && request.method === 'POST') {
      if (!env.MEDIA) return json({ error: 'MEDIA R2 not bound' }, 503);
      let form;
      try { form = await request.formData(); } catch { return json({ error: 'Expected multipart/form-data' }, 400); }
      const file = form.get('file');
      if (!file || typeof file === 'string') return json({ error: 'No file field' }, 422);
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
      if (!allowed.has(file.type)) return json({ error: `Type not allowed: ${file.type}` }, 422);
      const buf = await file.arrayBuffer();
      if (buf.byteLength > 15 * 1024 * 1024) return json({ error: 'Exceeds 15 MB' }, 413);
      const postId = form.get('postId') || 'unassigned';
      const ext    = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
      const key    = `${postId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      await env.MEDIA.put(key, buf, { httpMetadata: { contentType: file.type } });
      return json({ ok: true, url: `/api/media/${key}`, key });
    }

    // Data CRUD
    if (ALLOWED_KEYS.includes(route)) {
      if (request.method === 'GET') {
        const value = await env.NEEWOODY_KV.get(route);
        return new Response(value || 'null', {
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (request.method === 'PUT') {
        const body = await request.text();
        try { JSON.parse(body); } catch { return json({ error: 'Invalid JSON' }, 400); }
        await env.NEEWOODY_KV.put(route, body);
        return json({ ok: true });
      }
    }

    // Subscribe — accepts Web Push subscription OR Expo push token
    if (route === 'subscribe' && request.method === 'POST') {
      const payload = await request.json();
      const { crewId, subscription, fcmToken, platform } = payload;
      if (!crewId) return json({ error: 'Missing crewId' }, 400);

      if (platform === 'android' && fcmToken) {
        // Expo push token from native app
        await env.NEEWOODY_KV.put(`expo-${crewId}`, fcmToken);
        return json({ ok: true, channel: 'expo' });
      }

      if (subscription) {
        // Web Push subscription from browser
        await env.NEEWOODY_KV.put(`sub-${crewId}`, JSON.stringify(subscription));
        return json({ ok: true, channel: 'web-push' });
      }

      return json({ error: 'Missing subscription or fcmToken' }, 400);
    }

    // Unsubscribe — removes both channels for the crew member
    if (route === 'subscribe' && request.method === 'DELETE') {
      const crewId = parts[1];
      if (crewId) {
        await env.NEEWOODY_KV.delete(`sub-${crewId}`);
        await env.NEEWOODY_KV.delete(`expo-${crewId}`);
      }
      return json({ ok: true });
    }

    // Notify — sends to all specified crew via whichever channel they have
    if (route === 'notify' && request.method === 'POST') {
      const { crewIds, title, body } = await request.json();
      if (!crewIds?.length || !title) return json({ error: 'Missing fields' }, 400);
      await Promise.allSettled(crewIds.map(id => notifyCrew(env, id, title, body || '')));
      return json({ ok: true });
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};
