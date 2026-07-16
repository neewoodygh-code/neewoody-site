// ═══════════════════════════════════════════════════════════════════════
//  concierge-api — Carpentry Concierge membership API (Cloudflare Worker)
//
//  DELIBERATELY ISOLATED from neewoody-dispatch-api. Do not merge the two.
//  Storage: D1 (binding DB = "concierge") + R2 (binding MEDIA = "neewoody-media").
//  Secret:  SESSION_SECRET (wrangler secret put SESSION_SECRET) — HMAC key.
//
//  Auth model: phone + 5-digit PIN. Stateless HMAC-signed bearer token.
//  No email, no SMS, no self-service registration/reset (Phase 1).
// ═══════════════════════════════════════════════════════════════════════

// 2026-07-15 revision: 'furniture' split into cabinet_construction /
// interior_work / solid_wood_furniture; glass_aluminium retired;
// outdoor_structures (pergolas, huts, sheds, decking) added. Profiles saved
// before the revision may still carry retired keys — they render via a
// legacy label map on the frontend and drop out on the member's next save.
const SPECIALTIES = [
  'cabinet_construction', 'interior_work', 'solid_wood_furniture',
  'upholstery', 'finishing_spray', 'outdoor_structures',
  'site_construction', 'cnc_machining', 'other',
];
const PHOTO_MAX_BYTES = 300 * 1024; // server-side cap; client compresses to ~250KB max

// Self-set by members in edit-profile (owner decision 2026-07-15);
// admin can correct a member's level from the admin table.
const SKILL_LEVELS = ['apprentice', 'carpenter', 'master'];

// Availability badge — the seeker/giver signal on directory cards and the
// candidate-pool filter for the jobs board.
const AVAILABILITY = ['open_to_work', 'hiring', 'seeking_apprenticeship', 'taking_apprentices'];

// Jobs board caps (notice board, not a scheduler)
const JOBS_MAX_OPEN_PER_MEMBER = 10;
const JOBS_MAX_TEXT = { zone: 60, start_when: 40, duration: 40, description: 1000 };

// Web Push (job alerts). Concierge has its OWN VAPID keypair — secrets
// VAPID_PUBLIC / VAPID_PRIVATE / VAPID_X / VAPID_Y — completely separate
// from the dispatch worker's keys.
const VAPID_SUBJECT = 'mailto:neewoodygh@gmail.com';
const PUSH_MAX_PER_JOB = 200; // safety cap per job post
const TOKEN_TTL_MS   = 30 * 24 * 60 * 60 * 1000; // 30 days
const PBKDF2_ITERS   = 100_000;
const RATE_LIMIT_MAX = 5;                         // failed PINs
const RATE_WINDOW    = "-15 minutes";            // per phone

const ALLOWED_ORIGINS = [
  'https://neewoodygh.com',
  'https://www.neewoodygh.com',
];

// ── entrypoint ─────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    try {
      const res = await route(request, env, ctx);
      // fold CORS onto whatever route() produced
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      return json({ error: 'server_error', detail: String(err && err.message || err) }, 500, cors);
    }
  },
};

// ── router ─────────────────────────────────────────────────────────────
async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  // ---- public ----
  if (path === '/api/auth/login' && method === 'POST') return login(request, env);
  if (path === '/api/health' && method === 'GET') return json({ ok: true });

  // Member photos are public GETs (they load in <img> tags, which can't send
  // Authorization headers). Avatars/logos only — low sensitivity by design.
  const mMedia = path.match(/^\/api\/media\/members\/(233\d{9})\.jpg$/);
  if (mMedia && method === 'GET') return servePhoto(env, request, mMedia[1]);

  // ---- member ----
  if (path === '/api/me' && method === 'GET')  return withAuth(request, env, (m) => json({ member: sanitize(m) }));
  if (path === '/api/me' && method === 'PUT')  return withAuth(request, env, (m) => updateMe(request, env, m));
  if (path === '/api/me/photo' && method === 'POST')   return withAuth(request, env, (m) => uploadPhoto(request, env, m.phone));
  if (path === '/api/me/photo' && method === 'DELETE') return withAuth(request, env, (m) => deletePhoto(env, m.phone));
  if (path === '/api/directory' && method === 'GET') return withAuth(request, env, () => directory(env));

  // ---- member: job alert subscriptions (Web Push) ----
  if (path === '/api/me/push' && method === 'POST')   return withAuth(request, env, (m) => savePushSub(request, env, m));
  if (path === '/api/me/push' && method === 'DELETE') return withAuth(request, env, (m) => deletePushSub(request, env, m));

  // ---- member: jobs board ----
  if (path === '/api/jobs' && method === 'GET')  return withAuth(request, env, (m) => listJobs(env, m));
  if (path === '/api/jobs' && method === 'POST') return withAuth(request, env, (m) => createJob(request, env, m, ctx));
  const mJob = path.match(/^\/api\/jobs\/(\d+)$/);
  if (mJob && method === 'PUT')    return withAuth(request, env, (m) => updateJob(request, env, m, Number(mJob[1])));
  if (mJob && method === 'DELETE') return withAuth(request, env, (m) => deleteJob(env, m, Number(mJob[1])));

  // ---- member: saved cutlists (free to use, login to persist) ----
  if (path === '/api/cutlists' && method === 'GET')  return withAuth(request, env, (m) => listCutlists(env, m));
  if (path === '/api/cutlists' && method === 'POST') return withAuth(request, env, (m) => saveCutlist(request, env, m));
  const mCutlist = path.match(/^\/api\/cutlists\/(\d+)$/);
  if (mCutlist && method === 'GET')    return withAuth(request, env, (m) => getCutlist(env, m, Number(mCutlist[1])));
  if (mCutlist && method === 'DELETE') return withAuth(request, env, (m) => deleteCutlist(env, m, Number(mCutlist[1])));

  // ---- admin: members ----
  if (path === '/api/admin/members' && method === 'GET')  return withAdmin(request, env, () => adminListMembers(env));
  if (path === '/api/admin/members' && method === 'POST') return withAdmin(request, env, () => adminCreateMember(request, env));

  const mMember = path.match(/^\/api\/admin\/members\/([^/]+)$/);
  if (mMember && method === 'PUT') {
    return withAdmin(request, env, () => adminUpdateMember(request, env, decodeURIComponent(mMember[1])));
  }
  if (mMember && method === 'DELETE') {
    return withAdmin(request, env, (admin) => adminDeleteMember(request, env, admin, decodeURIComponent(mMember[1])));
  }

  const mMemberPhoto = path.match(/^\/api\/admin\/members\/([^/]+)\/photo$/);
  if (mMemberPhoto && method === 'POST') {
    return withAdmin(request, env, () => adminUploadPhoto(request, env, decodeURIComponent(mMemberPhoto[1])));
  }
  if (mMemberPhoto && method === 'DELETE') {
    return withAdmin(request, env, () => adminDeletePhoto(env, decodeURIComponent(mMemberPhoto[1])));
  }

  // ---- admin: payments ----
  if (path === '/api/admin/payments' && method === 'POST') return withAdmin(request, env, () => adminRecordPayment(request, env));
  if (path === '/api/admin/payments' && method === 'GET')  return withAdmin(request, env, () => adminListPayments(request, env));

  return json({ error: 'not_found' }, 404);
}

// ═══════════════════════════════════════════════════════════════════════
//  Handlers
// ═══════════════════════════════════════════════════════════════════════

async function login(request, env) {
  const body = await readJson(request);
  const phone = normalizePhone(body.phone);
  const pin = String(body.pin || '');

  // Generic error — never reveal which of phone/pin was wrong.
  const fail = () => json({ error: 'invalid_credentials' }, 401);

  if (!phone || !/^\d{5}$/.test(pin)) return fail();

  // Prune this phone's attempts older than the window while we're here — keeps
  // login_attempts self-cleaning so it never grows unbounded.
  await env.DB.prepare(
    `DELETE FROM login_attempts WHERE phone = ? AND attempted_at < datetime('now', ?)`
  ).bind(phone, RATE_WINDOW).run();

  // rate limit: failed attempts for this phone in the window
  const rl = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_attempts
     WHERE phone = ? AND success = 0 AND attempted_at >= datetime('now', ?)`
  ).bind(phone, RATE_WINDOW).first();
  if (rl && rl.c >= RATE_LIMIT_MAX) {
    return json({ error: 'too_many_attempts', retry_after_minutes: 15 }, 429);
  }

  const member = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  if (!member) { await recordAttempt(env, phone, false); return fail(); }

  const ok = await verifyPin(pin, member.pin_hash);
  await recordAttempt(env, phone, ok);
  if (!ok) return fail();

  const token = await signToken(phone, env);
  return json({ token, member: sanitize(member) });
}

async function updateMe(request, env, member) {
  const body = await readJson(request);
  const fields = {};
  if ('name' in body) {
    const name = String(body.name || '').trim();
    if (!name) return json({ error: 'name_required' }, 400);
    fields.name = name;
  }
  if ('business_name' in body) fields.business_name = nullableStr(body.business_name);
  if ('area' in body) fields.area = nullableStr(body.area);
  if ('photo_url' in body) fields.photo_url = nullableStr(body.photo_url);
  if ('skill_level' in body) {
    const lvl = validateSkillLevel(body.skill_level);
    if (lvl === false) return json({ error: 'invalid_skill_level' }, 400);
    fields.skill_level = lvl;
  }
  if ('years_experience' in body) {
    const yrs = validateYears(body.years_experience);
    if (yrs === false) return json({ error: 'invalid_years' }, 400);
    fields.years_experience = yrs;
  }
  if ('is_business' in body) fields.is_business = body.is_business ? 1 : 0;
  if ('availability' in body) {
    const av = validateAvailability(body.availability);
    if (av === false) return json({ error: 'invalid_availability' }, 400);
    fields.availability = av;
  }
  if ('specialties' in body) {
    const spec = validateSpecialties(body.specialties);
    if (!spec) return json({ error: 'invalid_specialties' }, 400);
    fields.specialties = spec;
  }
  // Self-service PIN change (member changing their OWN PIN while authenticated).
  // Distinct from the admin-only forgotten-PIN reset — this closes the loop so
  // the owner no longer knows a member's PIN after handing out the initial one.
  if ('pin' in body && body.pin != null && body.pin !== '') {
    if (!/^\d{5}$/.test(String(body.pin))) return json({ error: 'pin_must_be_5_digits' }, 400);
    fields.pin_hash = await hashPin(String(body.pin));
  }
  const keys = Object.keys(fields);
  if (!keys.length) return json({ member: sanitize(member) });

  const set = keys.map((k) => `${k} = ?`).join(', ');
  const vals = keys.map((k) => fields[k]);
  await env.DB.prepare(`UPDATE members SET ${set} WHERE phone = ?`).bind(...vals, member.phone).run();

  const updated = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(member.phone).first();
  return json({ member: sanitize(updated) });
}

async function directory(env) {
  const { results } = await env.DB.prepare(
    `SELECT name, business_name, area, specialties, photo_url, phone,
            skill_level, years_experience, is_business, availability
     FROM members WHERE status = 'approved' ORDER BY name COLLATE NOCASE`
  ).all();
  return json({ members: (results || []).map((r) => ({ ...r, specialties: parseSpec(r.specialties), is_business: !!r.is_business })) });
}

async function adminListMembers(env) {
  const { results } = await env.DB.prepare(
    `SELECT phone, name, business_name, area, specialties, photo_url,
            skill_level, years_experience, is_business, availability,
            role, status, is_founder, joined_at, created_at
     FROM members ORDER BY created_at DESC`
  ).all();
  return json({ members: (results || []).map(sanitize) });
}

async function adminCreateMember(request, env) {
  const body = await readJson(request);
  const phone = normalizePhone(body.phone);
  if (!phone) return json({ error: 'invalid_phone' }, 400);

  const name = String(body.name || '').trim();
  if (!name) return json({ error: 'name_required' }, 400);

  const pin = String(body.pin || '');
  if (!/^\d{5}$/.test(pin)) return json({ error: 'pin_must_be_5_digits' }, 400);

  const specialties = validateSpecialties(body.specialties);
  if (!specialties) return json({ error: 'invalid_specialties' }, 400);

  const existing = await env.DB.prepare('SELECT phone FROM members WHERE phone = ?').bind(phone).first();
  if (existing) return json({ error: 'member_exists' }, 409);

  const pin_hash = await hashPin(pin);
  const role = body.role === 'admin' ? 'admin' : 'member';
  const status = ['pending', 'approved', 'suspended'].includes(body.status) ? body.status : 'pending';
  const is_founder = body.is_founder ? 1 : 0;
  const joined_at = typeof body.joined_at === 'string' && body.joined_at ? body.joined_at : new Date().toISOString();
  const skill_level = validateSkillLevel(body.skill_level);
  if (skill_level === false) return json({ error: 'invalid_skill_level' }, 400);
  const years_experience = validateYears(body.years_experience);
  if (years_experience === false) return json({ error: 'invalid_years' }, 400);
  const availability = validateAvailability(body.availability);
  if (availability === false) return json({ error: 'invalid_availability' }, 400);
  const is_business = body.is_business ? 1 : 0;

  await env.DB.prepare(
    `INSERT INTO members
       (phone, name, business_name, area, specialties, pin_hash, photo_url, role, status, is_founder, joined_at,
        skill_level, years_experience, is_business, availability)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    phone, name, nullableStr(body.business_name), nullableStr(body.area),
    specialties, pin_hash, nullableStr(body.photo_url), role, status, is_founder, joined_at,
    skill_level, years_experience, is_business, availability
  ).run();

  const created = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  return json({ member: sanitize(created) }, 201);
}

async function adminUpdateMember(request, env, rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return json({ error: 'invalid_phone' }, 400);

  const member = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  if (!member) return json({ error: 'not_found' }, 404);

  const body = await readJson(request);
  const fields = {};

  if ('status' in body) {
    if (!['pending', 'approved', 'suspended'].includes(body.status)) return json({ error: 'invalid_status' }, 400);
    fields.status = body.status;
  }
  if ('role' in body) {
    if (!['member', 'admin'].includes(body.role)) return json({ error: 'invalid_role' }, 400);
    fields.role = body.role;
  }
  if ('is_founder' in body) fields.is_founder = body.is_founder ? 1 : 0;

  // profile fields — admin may correct member details too
  if ('name' in body) {
    const name = String(body.name || '').trim();
    if (!name) return json({ error: 'name_required' }, 400);
    fields.name = name;
  }
  if ('business_name' in body) fields.business_name = nullableStr(body.business_name);
  if ('area' in body) fields.area = nullableStr(body.area);
  if ('photo_url' in body) fields.photo_url = nullableStr(body.photo_url);
  if ('skill_level' in body) {
    const lvl = validateSkillLevel(body.skill_level);
    if (lvl === false) return json({ error: 'invalid_skill_level' }, 400);
    fields.skill_level = lvl;
  }
  if ('years_experience' in body) {
    const yrs = validateYears(body.years_experience);
    if (yrs === false) return json({ error: 'invalid_years' }, 400);
    fields.years_experience = yrs;
  }
  if ('is_business' in body) fields.is_business = body.is_business ? 1 : 0;
  if ('availability' in body) {
    const av = validateAvailability(body.availability);
    if (av === false) return json({ error: 'invalid_availability' }, 400);
    fields.availability = av;
  }
  if ('specialties' in body) {
    const spec = validateSpecialties(body.specialties);
    if (!spec) return json({ error: 'invalid_specialties' }, 400);
    fields.specialties = spec;
  }

  // PIN reset (admin-only path — the only reset mechanism in Phase 1)
  if ('pin' in body && body.pin != null && body.pin !== '') {
    if (!/^\d{5}$/.test(String(body.pin))) return json({ error: 'pin_must_be_5_digits' }, 400);
    fields.pin_hash = await hashPin(String(body.pin));
  }

  const keys = Object.keys(fields);
  if (keys.length) {
    const set = keys.map((k) => `${k} = ?`).join(', ');
    const vals = keys.map((k) => fields[k]);
    await env.DB.prepare(`UPDATE members SET ${set} WHERE phone = ?`).bind(...vals, phone).run();
  }

  const updated = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  return json({ member: sanitize(updated) });
}

// Permanent member deletion. Guards, in order:
//   1. the request body must echo the member's phone in `confirm` (a bare
//      DELETE without the deliberate echo is rejected — protects against a
//      stray or replayed call, and backs the two client-side sanity checks);
//   2. an admin can never delete their own account (lockout protection —
//      especially the only admin);
// Deletes the member row plus everything keyed to them: payments (FK would
// block otherwise — the client confirm dialog warns payment history goes
// too), saved cutlists, login attempts, and the R2 photo.
async function adminDeleteMember(request, env, admin, rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return json({ error: 'invalid_phone' }, 400);

  const body = await readJson(request);
  if (normalizePhone(body.confirm) !== phone) return json({ error: 'confirm_mismatch' }, 400);

  if (phone === admin.phone) return json({ error: 'cannot_delete_self' }, 400);

  const member = await env.DB.prepare('SELECT phone FROM members WHERE phone = ?').bind(phone).first();
  if (!member) return json({ error: 'member_not_found' }, 404);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM payments WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM saved_cutlists WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM login_attempts WHERE phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM jobs WHERE poster_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM push_subs WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM members WHERE phone = ?').bind(phone),
  ]);
  await env.MEDIA.delete(photoKey(phone));

  return json({ deleted: true, phone });
}

async function adminRecordPayment(request, env) {
  const body = await readJson(request);
  const phone = normalizePhone(body.member_phone);
  if (!phone) return json({ error: 'invalid_phone' }, 400);

  const period = String(body.period || '');
  if (!/^\d{4}-\d{2}$/.test(period)) return json({ error: 'period_must_be_YYYY_MM' }, 400);

  const amount = Number(body.amount_ghs);
  if (!Number.isInteger(amount) || amount <= 0) return json({ error: 'invalid_amount' }, 400);

  const member = await env.DB.prepare('SELECT phone FROM members WHERE phone = ?').bind(phone).first();
  if (!member) return json({ error: 'member_not_found' }, 404);

  // Upsert so re-recording the same month corrects rather than errors.
  await env.DB.prepare(
    `INSERT INTO payments (member_phone, period, amount_ghs, momo_ref)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(member_phone, period)
     DO UPDATE SET amount_ghs = excluded.amount_ghs, momo_ref = excluded.momo_ref, recorded_at = datetime('now')`
  ).bind(phone, period, amount, nullableStr(body.momo_ref)).run();

  const row = await env.DB.prepare(
    'SELECT * FROM payments WHERE member_phone = ? AND period = ?'
  ).bind(phone, period).first();
  return json({ payment: row }, 201);
}

async function adminListPayments(request, env) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || '';
  if (!/^\d{4}-\d{2}$/.test(period)) return json({ error: 'period_must_be_YYYY_MM' }, 400);

  const { results } = await env.DB.prepare(
    `SELECT p.id, p.member_phone, p.period, p.amount_ghs, p.momo_ref, p.recorded_at,
            m.name, m.business_name
     FROM payments p JOIN members m ON m.phone = p.member_phone
     WHERE p.period = ? ORDER BY p.recorded_at DESC`
  ).bind(period).all();
  return json({ period, payments: results || [] });
}

// ── jobs board ─────────────────────────────────────────────────────────
// A notice board: any approved member posts freely; applications happen on
// WhatsApp via the poster's wa.me link (never in-platform messaging). No
// rate field — money is discussed in chat (owner decision, 2026-07-16).

async function listJobs(env, member) {
  // All open jobs (filled ones stay visible as social proof), plus the
  // caller's own jobs regardless of status so they can manage them.
  const { results } = await env.DB.prepare(
    `SELECT j.id, j.poster_phone, j.zone, j.trade, j.skill_level, j.workers,
            j.start_when, j.duration, j.description, j.status, j.created_at,
            m.name AS poster_name, m.business_name AS poster_business, m.is_business AS poster_is_business
     FROM jobs j JOIN members m ON m.phone = j.poster_phone
     WHERE j.status IN ('open','filled') AND m.status = 'approved'
     ORDER BY j.status = 'open' DESC, j.created_at DESC`
  ).all();
  return json({
    jobs: (results || []).map((j) => ({ ...j, poster_is_business: !!j.poster_is_business, mine: j.poster_phone === member.phone })),
  });
}

async function createJob(request, env, member, ctx) {
  const body = await readJson(request);

  const zone = nullableStr(body.zone);
  if (!zone || zone.length > JOBS_MAX_TEXT.zone) return json({ error: 'zone_required' }, 400);

  let trade = nullableStr(body.trade);
  if (trade && !SPECIALTIES.includes(trade)) return json({ error: 'invalid_trade' }, 400);

  const skill_level = validateSkillLevel(body.skill_level);
  if (skill_level === false) return json({ error: 'invalid_skill_level' }, 400);

  const workers = Number(body.workers == null || body.workers === '' ? 1 : body.workers);
  if (!Number.isInteger(workers) || workers < 1 || workers > 50) return json({ error: 'invalid_workers' }, 400);

  const start_when = nullableStr(body.start_when);
  if (start_when && start_when.length > JOBS_MAX_TEXT.start_when) return json({ error: 'start_too_long' }, 400);
  const duration = nullableStr(body.duration);
  if (duration && duration.length > JOBS_MAX_TEXT.duration) return json({ error: 'duration_too_long' }, 400);
  const description = nullableStr(body.description);
  if (description && description.length > JOBS_MAX_TEXT.description) return json({ error: 'description_too_long' }, 400);

  const open = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM jobs WHERE poster_phone = ? AND status = 'open'`
  ).bind(member.phone).first();
  if (open && open.c >= JOBS_MAX_OPEN_PER_MEMBER) {
    return json({ error: 'too_many_open_jobs', limit: JOBS_MAX_OPEN_PER_MEMBER }, 400);
  }

  const r = await env.DB.prepare(
    `INSERT INTO jobs (poster_phone, zone, trade, skill_level, workers, start_when, duration, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(member.phone, zone, trade, skill_level, workers, start_when, duration, description).run();

  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(r.meta.last_row_id).first();

  // Alert members in the job's zone — after the response, so posting stays fast.
  const notify = notifyZone(env, row, member).catch((e) => console.error('job alert send failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify);

  return json({ job: row }, 201);
}

// Push a "new job in your area" alert to approved members whose area matches
// the job's zone (excluding the poster). Expired subscriptions are pruned.
async function notifyZone(env, job, poster) {
  if (!env.VAPID_PRIVATE) return; // push not configured — never break posting
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.sub FROM push_subs s
     JOIN members m ON m.phone = s.member_phone
     WHERE m.area = ? AND m.status = 'approved' AND m.phone != ?
     LIMIT ?`
  ).bind(job.zone, poster.phone, PUSH_MAX_PER_JOB).all();
  if (!results || !results.length) return;

  const trade = job.trade ? job.trade.replace(/_/g, ' ') : 'any trade';
  const title = 'New job in ' + job.zone;
  const body = job.workers + ' × ' + trade + (job.start_when ? ' · starts ' + job.start_when : '') + ' — tap to view and contact the poster.';

  for (const row of results) {
    let sub;
    try { sub = JSON.parse(row.sub); } catch { continue; }
    const status = await sendWebPush(sub, title, body, env);
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(row.id).run();
    }
  }
}

async function savePushSub(request, env, member) {
  const body = await readJson(request);
  const sub = body.subscription;
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) ||
      !sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') {
    return json({ error: 'invalid_subscription' }, 400);
  }
  const subStr = JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  if (subStr.length > 4096) return json({ error: 'invalid_subscription' }, 400);
  await env.DB.prepare(
    `INSERT INTO push_subs (member_phone, endpoint, sub) VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET member_phone = excluded.member_phone, sub = excluded.sub`
  ).bind(member.phone, sub.endpoint, subStr).run();
  return json({ subscribed: true }, 201);
}

async function deletePushSub(request, env, member) {
  const body = await readJson(request);
  const endpoint = String(body.endpoint || '');
  if (!endpoint) return json({ error: 'endpoint_required' }, 400);
  await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND member_phone = ?')
    .bind(endpoint, member.phone).run();
  return json({ subscribed: false });
}

// Poster (or admin) marks filled / reopens.
async function updateJob(request, env, member, id) {
  const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
  if (!job) return json({ error: 'not_found' }, 404);
  if (job.poster_phone !== member.phone && member.role !== 'admin') return json({ error: 'forbidden' }, 403);

  const body = await readJson(request);
  if (!['open', 'filled'].includes(body.status)) return json({ error: 'invalid_status' }, 400);

  await env.DB.prepare(
    `UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(body.status, id).run();
  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
  return json({ job: row });
}

// Poster (or admin — moderation) removes the post entirely.
async function deleteJob(env, member, id) {
  const job = await env.DB.prepare('SELECT poster_phone FROM jobs WHERE id = ?').bind(id).first();
  if (!job) return json({ error: 'not_found' }, 404);
  if (job.poster_phone !== member.phone && member.role !== 'admin') return json({ error: 'forbidden' }, 403);
  await env.DB.prepare('DELETE FROM jobs WHERE id = ?').bind(id).run();
  return json({ deleted: true });
}

// ── saved cutlists ─────────────────────────────────────────────────────

const CUTLIST_MAX_PER_MEMBER = 50;
const CUTLIST_MAX_CONFIG_BYTES = 64 * 1024; // generous; real configs are a few KB
const CUTLIST_MAX_NAME_LEN = 80;

async function listCutlists(env, member) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, created_at, updated_at FROM saved_cutlists
     WHERE member_phone = ? ORDER BY updated_at DESC`
  ).bind(member.phone).all();
  return json({ cutlists: results || [] });
}

async function saveCutlist(request, env, member) {
  const body = await readJson(request);
  const name = String(body.name || '').trim().slice(0, CUTLIST_MAX_NAME_LEN);
  if (!name) return json({ error: 'name_required' }, 400);

  let configStr;
  try {
    configStr = JSON.stringify(body.config);
  } catch { configStr = null; }
  if (!configStr || configStr === 'null' || typeof body.config !== 'object') {
    return json({ error: 'config_required' }, 400);
  }
  if (configStr.length > CUTLIST_MAX_CONFIG_BYTES) return json({ error: 'config_too_large' }, 400);

  // count cap only applies to NEW names (re-saving an existing name is an update)
  const existing = await env.DB.prepare(
    'SELECT id FROM saved_cutlists WHERE member_phone = ? AND name = ?'
  ).bind(member.phone, name).first();
  if (!existing) {
    const c = await env.DB.prepare(
      'SELECT COUNT(*) AS c FROM saved_cutlists WHERE member_phone = ?'
    ).bind(member.phone).first();
    if (c && c.c >= CUTLIST_MAX_PER_MEMBER) return json({ error: 'too_many_cutlists', limit: CUTLIST_MAX_PER_MEMBER }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO saved_cutlists (member_phone, name, config)
     VALUES (?, ?, ?)
     ON CONFLICT(member_phone, name)
     DO UPDATE SET config = excluded.config, updated_at = datetime('now')`
  ).bind(member.phone, name, configStr).run();

  const row = await env.DB.prepare(
    'SELECT id, name, created_at, updated_at FROM saved_cutlists WHERE member_phone = ? AND name = ?'
  ).bind(member.phone, name).first();
  return json({ cutlist: row, updated: !!existing }, existing ? 200 : 201);
}

async function getCutlist(env, member, id) {
  const row = await env.DB.prepare(
    'SELECT id, name, config, created_at, updated_at FROM saved_cutlists WHERE id = ? AND member_phone = ?'
  ).bind(id, member.phone).first();
  if (!row) return json({ error: 'not_found' }, 404);
  let config;
  try { config = JSON.parse(row.config); } catch { config = null; }
  return json({ cutlist: { id: row.id, name: row.name, config, created_at: row.created_at, updated_at: row.updated_at } });
}

async function deleteCutlist(env, member, id) {
  const r = await env.DB.prepare(
    'DELETE FROM saved_cutlists WHERE id = ? AND member_phone = ?'
  ).bind(id, member.phone).run();
  if (!r.meta || r.meta.changes === 0) return json({ error: 'not_found' }, 404);
  return json({ deleted: true });
}

// ── member photos (R2, concierge/members/ prefix) ──────────────────────
// One photo per member, keyed by phone; a new upload overwrites the old, so
// storage is bounded at (member count × ~60KB). The client compresses to a
// 512px square JPEG before upload; the size cap here is the backstop.

function photoKey(phone) { return `concierge/members/${phone}.jpg`; }

async function uploadPhoto(request, env, phone) {
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('image/jpeg')) return json({ error: 'invalid_image' }, 400);
  const buf = await request.arrayBuffer();
  // JPEG magic bytes FF D8 — rejects arbitrary payloads renamed to image/jpeg
  const head = new Uint8Array(buf.slice(0, 2));
  if (buf.byteLength < 128 || head[0] !== 0xff || head[1] !== 0xd8) {
    return json({ error: 'invalid_image' }, 400);
  }
  if (buf.byteLength > PHOTO_MAX_BYTES) return json({ error: 'photo_too_large', max_kb: 300 }, 413);

  await env.MEDIA.put(photoKey(phone), buf, { httpMetadata: { contentType: 'image/jpeg' } });

  // Absolute URL on this worker's own origin — a relative /api/… path would
  // resolve against neewoodygh.com and hit the dispatch worker's route.
  const url = `${new URL(request.url).origin}/api/media/members/${phone}.jpg?v=${Date.now()}`;
  await env.DB.prepare('UPDATE members SET photo_url = ? WHERE phone = ?').bind(url, phone).run();
  const updated = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  return json({ member: sanitize(updated) }, 201);
}

async function deletePhoto(env, phone) {
  await env.MEDIA.delete(photoKey(phone));
  await env.DB.prepare('UPDATE members SET photo_url = NULL WHERE phone = ?').bind(phone).run();
  const updated = await env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
  return json({ member: sanitize(updated) });
}

async function adminUploadPhoto(request, env, rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return json({ error: 'invalid_phone' }, 400);
  const member = await env.DB.prepare('SELECT phone FROM members WHERE phone = ?').bind(phone).first();
  if (!member) return json({ error: 'member_not_found' }, 404);
  return uploadPhoto(request, env, phone);
}

async function adminDeletePhoto(env, rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return json({ error: 'invalid_phone' }, 400);
  const member = await env.DB.prepare('SELECT phone FROM members WHERE phone = ?').bind(phone).first();
  if (!member) return json({ error: 'member_not_found' }, 404);
  return deletePhoto(env, phone);
}

async function servePhoto(env, request, phone) {
  const obj = await env.MEDIA.get(photoKey(phone));
  if (!obj) return json({ error: 'not_found' }, 404);
  const etag = obj.httpEtag;
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { 'ETag': etag } });
  }
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'ETag': etag,
    },
  });
}

// ── Web Push send (RFC 8291 aes128gcm + RFC 8292 VAPID) ────────────────
// Ported from the proven implementation in the dispatch worker (worker.js);
// dispatch itself and its keys are untouched — Concierge signs with its own
// VAPID secrets. Returns the push service's HTTP status (0 on network error)
// so callers can prune 404/410 (expired) subscriptions.

async function sendWebPush(subscription, title, body, env) {
  try {
    const payload = JSON.stringify({ title, body, icon: '/images/logo.png', url: '/concierge/directory.html#jobs' });
    const encrypted = await encryptPushPayload(subscription, payload);
    const auth = await makeVAPIDAuth(subscription.endpoint, env);
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': auth,
        'TTL': '86400',
      },
      body: encrypted,
    });
    return res.status;
  } catch (e) {
    console.error('web push failed:', e && e.message);
    return 0;
  }
}

async function makeVAPIDAuth(endpoint, env) {
  const url = new URL(endpoint);
  const te = new TextEncoder();
  const header = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u(te.encode(JSON.stringify({
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
    { name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(`${header}.${payload}`)
  );
  return `vapid t=${header}.${payload}.${b64u(sig)},k=${env.VAPID_PUBLIC}`;
}

async function encryptPushPayload(subscription, message) {
  const te = new TextEncoder();
  const subPub = fromB64u(subscription.keys.p256dh);
  const authSec = fromB64u(subscription.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

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

  const ikmInfo = concatBytes(te.encode('WebPush: info\x00'), subPub, ephPubRaw);
  const ikmBase = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']);
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSec, info: ikmInfo }, ikmBase, 256
  );
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);

  const cek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: te.encode('Content-Encoding: aes128gcm\x00') }, ikmKey, 128
  );
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: te.encode('Content-Encoding: nonce\x00') }, ikmKey, 96
  );

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey,
    concatBytes(te.encode(message), new Uint8Array([2]))
  );

  const header = new Uint8Array(21 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(ephPubRaw, 21);
  return concatBytes(header, new Uint8Array(ciphertext));
}

function b64u(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  bytes.forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromB64u(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function concatBytes(...arrays) {
  const parts = arrays.map((a) => (a instanceof Uint8Array ? a : new Uint8Array(a)));
  const total = parts.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of parts) { out.set(a, off); off += a.length; }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
//  Auth middleware
// ═══════════════════════════════════════════════════════════════════════

async function withAuth(request, env, handler) {
  const member = await authenticate(request, env);
  if (!member) return json({ error: 'unauthorized' }, 401);
  return handler(member);
}

async function withAdmin(request, env, handler) {
  const member = await authenticate(request, env);
  if (!member) return json({ error: 'unauthorized' }, 401);
  if (member.role !== 'admin') return json({ error: 'forbidden' }, 403);
  return handler(member);
}

async function authenticate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const phone = await verifyToken(m[1].trim(), env);
  if (!phone) return null;
  return env.DB.prepare('SELECT * FROM members WHERE phone = ?').bind(phone).first();
}

// ═══════════════════════════════════════════════════════════════════════
//  Crypto: PIN hashing (PBKDF2) + token signing (HMAC-SHA-256)
// ═══════════════════════════════════════════════════════════════════════

async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2Bits(pin, salt);
  return `${b64(salt)}:${b64(bits)}`;
}

async function verifyPin(pin, stored) {
  const [saltB64, hashB64] = String(stored || '').split(':');
  if (!saltB64 || !hashB64) return false;
  const salt = fromB64(saltB64);
  const bits = await pbkdf2Bits(pin, salt);
  return timingSafeEqual(b64(bits), hashB64);
}

async function pbkdf2Bits(pin, salt) {
  const key = await crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' }, key, 256
  );
  return new Uint8Array(bits);
}

async function signToken(phone, env) {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = `${phone}.${expiry}`;
  const sig = await hmac(payload, env.SESSION_SECRET);
  return `${b64str(payload)}.${b64(sig)}`;
}

async function verifyToken(token, env) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let payload;
  try { payload = fromB64str(payloadB64); } catch { return null; }
  const expected = b64(await hmac(payload, env.SESSION_SECRET));
  if (!timingSafeEqual(expected, sigB64)) return null;

  const dot = payload.lastIndexOf('.');
  if (dot < 0) return null;
  const phone = payload.slice(0, dot);
  const expiry = Number(payload.slice(dot + 1));
  if (!phone || !Number.isFinite(expiry) || expiry < Date.now()) return null;
  return phone;
}

async function hmac(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw', enc(secret || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc(message));
  return new Uint8Array(sig);
}

// ═══════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════

function normalizePhone(raw) {
  if (raw == null) return null;
  let d = String(raw).replace(/[^\d]/g, '');
  if (d.startsWith('00')) d = d.slice(2);          // 00233...
  if (d.startsWith('233') && d.length === 12) return d;
  if (d.startsWith('0') && d.length === 10) return '233' + d.slice(1);
  if (d.length === 9 && d[0] !== '0') return '233' + d; // 24XXXXXXX
  return null;
}

function validateSpecialties(input) {
  let arr = input;
  if (typeof input === 'string') {
    try { arr = JSON.parse(input); } catch { arr = input.split(',').map((s) => s.trim()); }
  }
  if (!Array.isArray(arr)) return null;
  const clean = [...new Set(arr.map((s) => String(s).trim()).filter((s) => SPECIALTIES.includes(s)))];
  if (!clean.length) return null;
  return JSON.stringify(clean);
}

// Both return the cleaned value (null allowed = "not set"), or false when
// the input is present but invalid.
function validateSkillLevel(v) {
  if (v == null || v === '') return null;
  return SKILL_LEVELS.includes(String(v)) ? String(v) : false;
}

function validateYears(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return (Number.isInteger(n) && n >= 0 && n <= 70) ? n : false;
}

function validateAvailability(v) {
  if (v == null || v === '') return null;
  return AVAILABILITY.includes(String(v)) ? String(v) : false;
}

function parseSpec(text) {
  try { const a = JSON.parse(text); return Array.isArray(a) ? a : []; } catch { return []; }
}

function sanitize(m) {
  if (!m) return m;
  const { pin_hash, ...rest } = m;
  return { ...rest, specialties: parseSpec(m.specialties), is_founder: !!m.is_founder, is_business: !!m.is_business };
}

async function recordAttempt(env, phone, success) {
  await env.DB.prepare('INSERT INTO login_attempts (phone, success) VALUES (?, ?)')
    .bind(phone, success ? 1 : 0).run();
}

function nullableStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allow = (ALLOWED_ORIGINS.includes(origin) || isLocal) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// ── encoding ──
function enc(str) { return new TextEncoder().encode(str); }

function b64(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
function fromB64(s) {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function b64str(str) { return btoa(unescape(encodeURIComponent(str))); }
function fromB64str(s) { return decodeURIComponent(escape(atob(s))); }

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
