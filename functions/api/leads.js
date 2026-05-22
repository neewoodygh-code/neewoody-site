export async function onRequestGet(context) {
  const { request, env } = context;

  const headers = { 'Content-Type': 'application/json' };

  // Auth — same key used by the dispatch app
  const apiKey = request.headers.get('X-NWD-Key') || request.headers.get('x-api-key');
  if (apiKey !== 'nwd-dispatch-2024') {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers });
  }

  if (!env.KV) {
    return new Response(JSON.stringify([]), { headers });
  }

  try {
    const raw = await env.KV.get('nwd-leads');
    const leads = raw ? JSON.parse(raw) : [];

    // Newest first — sort by created_at or timestamp field
    leads.sort((a, b) => {
      const ta = new Date(a.created_at || a.timestamp || 0).getTime();
      const tb = new Date(b.created_at || b.timestamp || 0).getTime();
      return tb - ta;
    });

    return new Response(JSON.stringify(leads), { headers });
  } catch (err) {
    console.error('GET /api/leads error:', err);
    return new Response(JSON.stringify({ error: 'Failed to read leads' }), { status: 500, headers });
  }
}
