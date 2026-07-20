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
  'site_construction', 'cnc_machining',
  'interior_design', // service specialty (both types); carries its own card badge
  'other',
];
const PHOTO_MAX_BYTES = 300 * 1024; // server-side cap; client compresses to ~250KB max

// Self-set by members in edit-profile (owner decision 2026-07-15);
// admin can correct a member's level from the admin table.
const SKILL_LEVELS = ['apprentice', 'carpenter', 'master'];

// Availability badge — the seeker/giver signal on directory cards and the
// candidate-pool filter for the jobs board.
const AVAILABILITY = ['open_to_work', 'hiring', 'seeking_apprenticeship', 'taking_apprentices'];

// Member identity type — drives the card badge and whether the carpenter skill
// ladder (apprentice→master) applies. Vendors/interior designers aren't graded.
const MEMBER_TYPES = ['carpenter', 'vendor', 'courier'];
const STOCK_MAX = 1000; // vendor Storefront free-text cap
// Offered "services I offer" (stored as slugs in members.side_hustles) are
// validated against the admin-moderated service_catalog (migration 0021), not a
// const. 'deliveries_errands' is the courier-wired entry (see notifyBuyZone).
const COVERAGE_MAX_ZONES = 12;
const ZONE_NAME_MAX = 60;
const SERVICE_LABEL_MAX = 40;
// Member social links / website — fixed platform set, stored as JSON {key:url}.
const SOCIAL_KEYS = ['website', 'instagram', 'tiktok', 'facebook', 'youtube', 'linkedin'];
const SOCIAL_URL_MAX = 200;
// Vendor shop-size scale — the vendor parallel to a carpenter's skill level.
const VENDOR_SCALES = ['stall', 'shop', 'showroom', 'warehouse'];
// Vendor product categories (what they sell) — Sourcing filter vocabulary.
// interior_design kept for legacy data; new saves route it to vendor services.
const VENDOR_CATEGORIES = [
  'materials', 'hardware', 'tools_machinery', 'tooling_consumables', 'finishes',
  'interior_decor', 'lighting', 'glass_alu_stone', 'upholstery_supplies',
  'interior_design', 'other',
];
// Vendor services (what they do) — a second axis; curated so they double as
// Sourcing filters. services_other (free text) captures anything off-list.
const VENDOR_SERVICES = [
  'interior_design', 'installation', 'delivery', 'custom_fabrication', 'repairs',
  'consultation', 'spraying_finishing', 'upholstery', 'rental',
];
const VENDOR_SERVICES_MAX = 5;
const SERVICES_OTHER_MAX = 160;

// Jobs board caps (notice board, not a scheduler)
const JOBS_MAX_OPEN_PER_MEMBER = 10;
const JOBS_MAX_TEXT = { zone: 60, start_when: 40, duration: 40, description: 1000 };

// "Buy for me" board caps (member procurement/errand board)
const BUY_MAX_OPEN_PER_MEMBER = 10;
const BUY_MAX_ITEMS = 20;
const BUY_MAX_TEXT = { zone: 60, item: 120, qty: 40, deliver_detail: 200, where_to_buy: 120, budget: 60, needed_by: 60, notes: 1000 };

// Vendor orders caps
const ORDER_MAX_OPEN_PER_BUYER = 20;
const ORDER_QTY_MAX = 40;
const ORDER_DELIVER_MAX = 200;
const ORDER_NOTES_MAX = 500;

// Feature-suggestion box caps
const SUGGESTION_MAX = 1000;
const SUGGESTION_MAX_OPEN_PER_MEMBER = 15; // 'new' status, anti-spam

// Safety check-in (lone-worker call-outs)
const CALLOUT_GRACE_MIN = 15;                 // minutes past expected_back before overdue
const CALLOUT_MAX_HOURS = 12;                 // max expected duration a member can set
const CALLOUT_TEXT = { name: 80, phone: 30, location: 200, notes: 500 };

// Public client-job anti-spam (no CAPTCHA yet — phone-keyed throttle).
const CLIENT_JOB_MAX_PENDING_PER_PHONE = 3;   // outstanding unreviewed
const CLIENT_JOB_WINDOW = "-1 hours";
const CLIENT_JOB_MAX_PER_WINDOW = 3;          // per contact phone per hour

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

// Paystack (owner provisions PAYSTACK_SECRET as a Worker secret; CC never sees
// it). Hosted-checkout flow: init server-side → redirect → signed webhook
// confirms. One-time-per-period billing (no auto-renew v1).
const PAYSTACK_BASE = 'https://api.paystack.co';
const MONTHLY_FEE_GHS = 50;
const FOUNDER_FEE_GHS = 100;
const FOUNDER_CAP = 100;
const PAY_CALLBACK_URL = 'https://neewoodygh.com/concierge/directory.html?pay=return';
const PAY_JOIN_CALLBACK_URL = 'https://neewoodygh.com/concierge/login.html?joined=1';

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

  // Cron: scan for overdue safety call-outs and alert admins (see wrangler.toml).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scanOverdueCallouts(env).catch((e) => console.error('callout scan failed:', e && e.message)));
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

  // Paystack webhook (server-to-server; verified by HMAC signature, not auth).
  if (path === '/api/pay/webhook' && method === 'POST') return payWebhook(request, env, ctx);
  // Verify-on-return (public; reflects Paystack's own truth by reference).
  if (path === '/api/pay/verify' && method === 'POST') return payVerify(request, env, ctx);
  // Founder spots remaining (public — register.html shows/hides the founder tier).
  if (path === '/api/public/founder-spots' && method === 'GET') return founderSpots(env);

  // Public "Hire a Carpenter" — unauthenticated job request from a client
  // (homeowner, or a non-member master hiring hands). Lands as `pending`.
  if (path === '/api/public/jobs' && method === 'POST') return publicPostJob(request, env, ctx);

  // Public self-service membership registration. Applicant fills their own
  // profile + PIN; lands as `pending` (role member, never founder/admin) for
  // owner vetting. Removes the admin data-entry tedium; keeps the trust gate.
  if (path === '/api/public/register' && method === 'POST') return publicRegister(request, env, ctx);

  // Member photos are public GETs (they load in <img> tags, which can't send
  // Authorization headers). Avatars/logos only — low sensitivity by design.
  const mMedia = path.match(/^\/api\/media\/members\/(233\d{9})\.jpg$/);
  if (mMedia && method === 'GET') return servePhoto(env, request, mMedia[1]);
  const mStoreImg = path.match(/^\/api\/media\/storefront\/(233\d{9})\/(\d+)\.jpg$/);
  if (mStoreImg && method === 'GET') return serveStorefrontPhoto(env, request, mStoreImg[1], Number(mStoreImg[2]));

  // ---- member ----
  if (path === '/api/me' && method === 'GET')  return withAuth(request, env, (m) => getMe(env, m), { allowPending: true });
  if (path === '/api/pay/init' && method === 'POST') return withAuth(request, env, (m) => payInit(request, env, m), { allowPending: true });
  if (path === '/api/me' && method === 'PUT')  return withAuth(request, env, (m) => updateMe(request, env, m));
  if (path === '/api/me/photo' && method === 'POST')   return withAuth(request, env, (m) => uploadPhoto(request, env, m.phone));
  if (path === '/api/me/photo' && method === 'DELETE') return withAuth(request, env, (m) => deletePhoto(env, m.phone));
  if (path === '/api/directory' && method === 'GET') return withPaid(request, env, () => directory(env));

  // ---- member: storefront (vendor items) ----
  if (path === '/api/me/storefront' && method === 'GET')  return withAuth(request, env, (m) => listMyStorefront(env, m.phone));
  if (path === '/api/me/storefront' && method === 'POST') return withPaid(request, env, (m) => createStorefrontItem(request, env, m.phone));
  const mSItem = path.match(/^\/api\/me\/storefront\/(\d+)$/);
  if (mSItem && method === 'PUT')    return withPaid(request, env, (m) => updateStorefrontItem(request, env, m.phone, Number(mSItem[1])));
  if (mSItem && method === 'DELETE') return withAuth(request, env, (m) => deleteStorefrontItem(env, m.phone, Number(mSItem[1])));
  const mSItemPhoto = path.match(/^\/api\/me\/storefront\/(\d+)\/photo$/);
  if (mSItemPhoto && method === 'POST')   return withPaid(request, env, (m) => uploadStorefrontPhoto(request, env, m.phone, Number(mSItemPhoto[1])));
  if (mSItemPhoto && method === 'DELETE') return withAuth(request, env, (m) => deleteStorefrontPhoto(env, m.phone, Number(mSItemPhoto[1])));
  // a specific approved vendor's storefront (members browsing Sourcing)
  const mVendorStore = path.match(/^\/api\/storefront\/(233\d{9})$/);
  if (mVendorStore && method === 'GET') return withPaid(request, env, () => getVendorStorefront(env, mVendorStore[1]));

  // ---- member: job alert subscriptions (Web Push) ----
  if (path === '/api/me/push' && method === 'POST')   return withAuth(request, env, (m) => savePushSub(request, env, m));
  if (path === '/api/me/push' && method === 'DELETE') return withAuth(request, env, (m) => deletePushSub(request, env, m));

  // ---- member: jobs board ----
  if (path === '/api/jobs' && method === 'GET')  return withPaid(request, env, (m) => listJobs(env, m));
  if (path === '/api/jobs' && method === 'POST') return withPaid(request, env, (m) => createJob(request, env, m, ctx));
  const mJob = path.match(/^\/api\/jobs\/(\d+)$/);
  if (mJob && method === 'PUT')    return withPaid(request, env, (m) => updateJob(request, env, m, Number(mJob[1])));
  if (mJob && method === 'DELETE') return withPaid(request, env, (m) => deleteJob(env, m, Number(mJob[1])));

  // ---- member: "Buy for me" board (procurement/errand requests) ----
  if (path === '/api/buy-requests' && method === 'GET')  return withPaid(request, env, (m) => listBuyRequests(env, m));
  if (path === '/api/buy-requests' && method === 'POST') return withPaid(request, env, (m) => createBuyRequest(request, env, m, ctx));
  const mBuy = path.match(/^\/api\/buy-requests\/(\d+)$/);
  if (mBuy && method === 'PUT')    return withPaid(request, env, (m) => updateBuyRequest(request, env, m, Number(mBuy[1])));
  if (mBuy && method === 'DELETE') return withPaid(request, env, (m) => deleteBuyRequest(env, m, Number(mBuy[1])));

  // ---- member: notifications (in-app bell) ----
  if (path === '/api/notifications' && method === 'GET') return withAuth(request, env, (m) => listNotifications(env, m));
  if (path === '/api/notifications/read' && method === 'POST') return withAuth(request, env, (m) => markNotificationsRead(request, env, m));

  // ---- member: Support / feature suggestions (open to lapsed members too) ----
  if (path === '/api/suggestions' && method === 'GET')  return withAuth(request, env, (m) => listMySuggestions(env, m));
  if (path === '/api/suggestions' && method === 'POST') return withAuth(request, env, (m) => createSuggestion(request, env, m, ctx));

  // ---- member: safety check-in (open to lapsed members — it's safety) ----
  if (path === '/api/callouts' && method === 'GET')  return withAuth(request, env, (m) => listMyCallouts(env, m));
  if (path === '/api/callouts' && method === 'POST') return withAuth(request, env, (m) => createCallout(request, env, m));
  const mCallout = path.match(/^\/api\/callouts\/(\d+)$/);
  if (mCallout && method === 'PUT') return withAuth(request, env, (m) => updateCallout(request, env, m, Number(mCallout[1])));

  // ---- offered-services catalog ----
  if (path === '/api/services' && method === 'GET') return withAuth(request, env, () => listServices(env));
  if (path === '/api/services/suggest' && method === 'POST') return withPaid(request, env, (m) => suggestService(request, env, m, ctx));

  // ---- vendor orders (order a listed storefront item) ----
  if (path === '/api/orders' && method === 'POST') return withPaid(request, env, (m) => createOrder(request, env, m, ctx));
  if (path === '/api/orders' && method === 'GET')  return withAuth(request, env, (m) => listVendorOrders(env, m));
  const mOrder = path.match(/^\/api\/orders\/(\d+)$/);
  if (mOrder && method === 'PUT') return withAuth(request, env, (m) => updateOrder(request, env, m, Number(mOrder[1]), ctx));

  // ---- member: pricing tool (per-member config + quotes) ----
  if (path === '/api/pricing/config' && method === 'GET') return withAuth(request, env, (m) => getPricingConfig(env, m));
  if (path === '/api/pricing/config' && method === 'PUT') return withPaid(request, env, (m) => savePricingConfig(request, env, m));
  if (path === '/api/pricing/quotes' && method === 'GET') return withAuth(request, env, (m) => getQuotes(env, m));
  if (path === '/api/pricing/quotes' && method === 'PUT') return withPaid(request, env, (m) => saveQuotes(request, env, m));

  // ---- member: saved cutlists (free to use, login to persist) ----
  if (path === '/api/cutlists' && method === 'GET')  return withAuth(request, env, (m) => listCutlists(env, m));
  if (path === '/api/cutlists' && method === 'POST') return withPaid(request, env, (m) => saveCutlist(request, env, m));
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

  // ---- admin: client job requests (moderation) ----
  if (path === '/api/admin/client-jobs' && method === 'GET') return withAdmin(request, env, () => adminListClientJobs(env));
  const mClientJob = path.match(/^\/api\/admin\/client-jobs\/(\d+)$/);
  if (mClientJob && method === 'PUT')    return withAdmin(request, env, () => adminReviewClientJob(request, env, Number(mClientJob[1]), ctx));
  if (mClientJob && method === 'DELETE') return withAdmin(request, env, () => adminDeleteClientJob(env, Number(mClientJob[1])));

  // ---- admin: safety call-out monitor ----
  if (path === '/api/admin/callouts' && method === 'GET') return withAdmin(request, env, () => adminListCallouts(env));

  // ---- admin: feature suggestions ----
  if (path === '/api/admin/suggestions' && method === 'GET') return withAdmin(request, env, () => adminListSuggestions(env));
  const mSugg = path.match(/^\/api\/admin\/suggestions\/(\d+)$/);
  if (mSugg && method === 'PUT')    return withAdmin(request, env, () => adminUpdateSuggestion(request, env, Number(mSugg[1]), ctx));
  if (mSugg && method === 'DELETE') return withAdmin(request, env, () => adminDeleteSuggestion(env, Number(mSugg[1])));

  // ---- admin: service catalog (moderate the offered-services vocabulary) ----
  if (path === '/api/admin/services' && method === 'GET') return withAdmin(request, env, () => adminListServices(env));
  const mSvc = path.match(/^\/api\/admin\/services\/(\d+)$/);
  if (mSvc && method === 'PUT')    return withAdmin(request, env, () => adminUpdateService(request, env, Number(mSvc[1]), ctx));
  if (mSvc && method === 'DELETE') return withAdmin(request, env, () => adminDeleteService(env, Number(mSvc[1])));

  // ---- admin: payments ----
  if (path === '/api/admin/payments' && method === 'POST') return withAdmin(request, env, () => adminRecordPayment(request, env));
  if (path === '/api/admin/payments' && method === 'GET')  return withAdmin(request, env, () => adminListPayments(request, env));
  if (path === '/api/admin/payments' && method === 'DELETE') return withAdmin(request, env, () => adminDeletePayment(request, env));

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

  // Pay-to-join: suspended members are blocked; pending (unpaid) members CAN log
  // in, but the session is gated server-side (withAuth) to profile + payment
  // until the webhook confirms their payment and approves them. (Checked after a
  // correct PIN, so status is only ever revealed to the account's real owner.)
  if (member.status === 'suspended') {
    return json({ error: 'account_suspended' }, 403);
  }

  // Record last successful login (activity visibility for the admin).
  await env.DB.prepare(`UPDATE members SET last_login = datetime('now') WHERE phone = ?`).bind(phone).run();

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
    if (spec === null) return json({ error: 'invalid_specialties' }, 400);
    fields.specialties = spec;
  }
  if ('member_type' in body) {
    const mt = validateMemberType(body.member_type);
    if (mt === false) return json({ error: 'invalid_member_type' }, 400);
    fields.member_type = mt || 'carpenter';
  }
  // A carpenter must keep at least one trade; vendors carry none.
  {
    const effType = ('member_type' in fields ? fields.member_type : member.member_type) || 'carpenter';
    const effSpec = ('specialties' in fields ? fields.specialties : member.specialties) || '[]';
    if (effType === 'carpenter' && JSON.parse(effSpec).length === 0) return json({ error: 'invalid_specialties' }, 400);
  }
  if ('stock' in body) fields.stock = stockVal(body.stock);
  if ('location_lat' in body || 'location_lng' in body) {
    const lat = body.location_lat, lng = body.location_lng;
    if (lat == null || lat === '' || lng == null || lng === '') { fields.location_lat = null; fields.location_lng = null; }
    else {
      const la = Number(lat), lo = Number(lng);
      if (!isFinite(la) || !isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) return json({ error: 'invalid_location' }, 400);
      fields.location_lat = la; fields.location_lng = lo;
    }
  }
  if ('vendor_scale' in body) {
    const vs = validateVendorScale(body.vendor_scale);
    if (vs === false) return json({ error: 'invalid_vendor_scale' }, 400);
    fields.vendor_scale = vs;
  }
  if ('vendor_categories' in body) {
    const vc = validateVendorCategories(body.vendor_categories);
    if (vc === false) return json({ error: 'invalid_categories' }, 400);
    fields.vendor_categories = vc;
  }
  if ('vendor_services' in body) {
    const vs = validateVendorServices(body.vendor_services);
    if (vs === false) return json({ error: 'invalid_services' }, 400);
    fields.vendor_services = vs;
  }
  if ('services_other' in body) fields.services_other = servicesOtherVal(body.services_other);
  if ('coverage_zones' in body) {
    const cz = validateCoverageZones(body.coverage_zones);
    if (cz === false) return json({ error: 'invalid_coverage_zones' }, 400);
    fields.coverage_zones = cz;
  }
  if ('side_hustles' in body) {
    const sh = validateSideHustles(body.side_hustles, await approvedServiceSlugs(env));
    if (sh === false) return json({ error: 'invalid_side_hustles' }, 400);
    fields.side_hustles = sh;
  }
  if ('socials' in body) {
    const sc = validateSocials(body.socials);
    if (sc === false) return json({ error: 'invalid_socials' }, 400);
    fields.socials = sc;
  }
  if ('business_phone' in body) {
    const bp = bizPhone(body.business_phone);
    if (bp === false) return json({ error: 'invalid_business_phone' }, 400);
    fields.business_phone = bp;
  }
  // Hide personal (login) number — only allowed when a business number exists,
  // so members always keep a reachable contact channel.
  if ('hide_phone' in body) {
    const hp = body.hide_phone ? 1 : 0;
    const effBiz = ('business_phone' in fields) ? fields.business_phone : member.business_phone;
    if (hp && !effBiz) return json({ error: 'need_business_phone' }, 400);
    fields.hide_phone = hp;
  }
  // Emergency contact (safety check-in) — private; only self + admin ever see it.
  if ('emergency_name' in body) fields.emergency_name = nullableStr(body.emergency_name);
  if ('emergency_phone' in body) {
    const ep = body.emergency_phone == null || body.emergency_phone === '' ? null : normalizePhone(body.emergency_phone);
    if (body.emergency_phone && !ep) return json({ error: 'invalid_emergency_phone' }, 400);
    fields.emergency_phone = ep;
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
    `SELECT name, business_name, area, specialties, photo_url, phone, hide_phone,
            skill_level, years_experience, is_business, availability, member_type, stock,
            location_lat, location_lng, vendor_scale, vendor_categories, vendor_services, services_other,
            coverage_zones, side_hustles, socials, verified, business_phone
     FROM members WHERE status = 'approved' ORDER BY name COLLATE NOCASE`
  ).all();
  return json({ members: (results || []).map((r) => ({
    ...r,
    // Redact the personal (login) number from the member-facing directory when
    // the member has chosen to hide it. Contact then flows through business_phone.
    phone: r.hide_phone ? null : r.phone,
    hide_phone: !!r.hide_phone,
    specialties: parseSpec(r.specialties),
    vendor_categories: parseSpec(r.vendor_categories),
    vendor_services: parseSpec(r.vendor_services),
    coverage_zones: parseSpec(r.coverage_zones),
    side_hustles: parseSpec(r.side_hustles),
    socials: parseSocials(r.socials),
    verified: !!r.verified,
    is_business: !!r.is_business,
  })) });
}

async function adminListMembers(env) {
  const { results } = await env.DB.prepare(
    `SELECT phone, name, business_name, area, specialties, photo_url,
            skill_level, years_experience, is_business, availability, member_type, stock, vendor_scale,
            vendor_categories, vendor_services, services_other, coverage_zones, side_hustles, business_phone, hide_phone,
            role, status, is_founder, joined_at, created_at, last_login
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
  if (specialties === null) return json({ error: 'invalid_specialties' }, 400);

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
  const member_type = validateMemberType(body.member_type);
  if (member_type === false) return json({ error: 'invalid_member_type' }, 400);
  // Carpenters must carry at least one trade; vendors carry none.
  if ((member_type || 'carpenter') === 'carpenter' && JSON.parse(specialties).length === 0) return json({ error: 'invalid_specialties' }, 400);
  const vendor_scale = validateVendorScale(body.vendor_scale);
  if (vendor_scale === false) return json({ error: 'invalid_vendor_scale' }, 400);
  const vendor_categories = validateVendorCategories(body.vendor_categories);
  if (vendor_categories === false) return json({ error: 'invalid_categories' }, 400);
  const vendor_services = validateVendorServices(body.vendor_services);
  if (vendor_services === false) return json({ error: 'invalid_services' }, 400);
  const services_other = servicesOtherVal(body.services_other);
  const coverage_zones = validateCoverageZones(body.coverage_zones);
  if (coverage_zones === false) return json({ error: 'invalid_coverage_zones' }, 400);
  const side_hustles = validateSideHustles(body.side_hustles, await approvedServiceSlugs(env));
  if (side_hustles === false) return json({ error: 'invalid_side_hustles' }, 400);
  const business_phone = bizPhone(body.business_phone);
  if (business_phone === false) return json({ error: 'invalid_business_phone' }, 400);
  const hide_phone = body.hide_phone ? 1 : 0;
  if (hide_phone && !business_phone) return json({ error: 'need_business_phone' }, 400);

  await env.DB.prepare(
    `INSERT INTO members
       (phone, name, business_name, area, specialties, pin_hash, photo_url, role, status, is_founder, joined_at,
        skill_level, years_experience, is_business, availability, member_type, stock, vendor_scale, vendor_categories, vendor_services, services_other, coverage_zones, side_hustles, business_phone, hide_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    phone, name, nullableStr(body.business_name), nullableStr(body.area),
    specialties, pin_hash, nullableStr(body.photo_url), role, status, is_founder, joined_at,
    skill_level, years_experience, is_business, availability, member_type || 'carpenter', stockVal(body.stock), vendor_scale, vendor_categories, vendor_services, services_other, coverage_zones, side_hustles, business_phone, hide_phone
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
  if ('verified' in body) fields.verified = body.verified ? 1 : 0;

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
    if (spec === null) return json({ error: 'invalid_specialties' }, 400);
    fields.specialties = spec;
  }
  if ('member_type' in body) {
    const mt = validateMemberType(body.member_type);
    if (mt === false) return json({ error: 'invalid_member_type' }, 400);
    fields.member_type = mt || 'carpenter';
  }
  // A carpenter must keep at least one trade; vendors carry none.
  {
    const effType = ('member_type' in fields ? fields.member_type : member.member_type) || 'carpenter';
    const effSpec = ('specialties' in fields ? fields.specialties : member.specialties) || '[]';
    if (effType === 'carpenter' && JSON.parse(effSpec).length === 0) return json({ error: 'invalid_specialties' }, 400);
  }
  if ('stock' in body) fields.stock = stockVal(body.stock);
  if ('vendor_scale' in body) {
    const vs = validateVendorScale(body.vendor_scale);
    if (vs === false) return json({ error: 'invalid_vendor_scale' }, 400);
    fields.vendor_scale = vs;
  }
  if ('vendor_categories' in body) {
    const vc = validateVendorCategories(body.vendor_categories);
    if (vc === false) return json({ error: 'invalid_categories' }, 400);
    fields.vendor_categories = vc;
  }
  if ('vendor_services' in body) {
    const vs = validateVendorServices(body.vendor_services);
    if (vs === false) return json({ error: 'invalid_services' }, 400);
    fields.vendor_services = vs;
  }
  if ('services_other' in body) fields.services_other = servicesOtherVal(body.services_other);
  if ('coverage_zones' in body) {
    const cz = validateCoverageZones(body.coverage_zones);
    if (cz === false) return json({ error: 'invalid_coverage_zones' }, 400);
    fields.coverage_zones = cz;
  }
  if ('side_hustles' in body) {
    const sh = validateSideHustles(body.side_hustles, await approvedServiceSlugs(env));
    if (sh === false) return json({ error: 'invalid_side_hustles' }, 400);
    fields.side_hustles = sh;
  }
  if ('socials' in body) {
    const sc = validateSocials(body.socials);
    if (sc === false) return json({ error: 'invalid_socials' }, 400);
    fields.socials = sc;
  }
  if ('business_phone' in body) {
    const bp = bizPhone(body.business_phone);
    if (bp === false) return json({ error: 'invalid_business_phone' }, 400);
    fields.business_phone = bp;
  }
  if ('hide_phone' in body) {
    const hp = body.hide_phone ? 1 : 0;
    const effBiz = ('business_phone' in fields) ? fields.business_phone : member.business_phone;
    if (hp && !effBiz) return json({ error: 'need_business_phone' }, 400);
    fields.hide_phone = hp;
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
    env.DB.prepare('DELETE FROM payment_intents WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM saved_cutlists WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM login_attempts WHERE phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM jobs WHERE poster_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM buy_requests WHERE poster_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM orders WHERE vendor_phone = ? OR buyer_phone = ?').bind(phone, phone),
    env.DB.prepare('DELETE FROM suggestions WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM callouts WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM notifications WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM push_subs WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM pricing_configs WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM pricing_quotes WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM storefront_items WHERE member_phone = ?').bind(phone),
    env.DB.prepare('DELETE FROM members WHERE phone = ?').bind(phone),
  ]);
  await env.MEDIA.delete(photoKey(phone));
  // Remove all storefront item images for this member (R2 prefix delete).
  try {
    const listed = await env.MEDIA.list({ prefix: `concierge/storefront/${phone}/` });
    await Promise.all((listed.objects || []).map((o) => env.MEDIA.delete(o.key)));
  } catch (e) { console.error('storefront image cleanup failed:', e && e.message); }

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

// Reverse a wrongly-recorded payment (member + period). Idempotent: deleting
// a row that isn't there returns deleted:0 rather than erroring.
async function adminDeletePayment(request, env) {
  const body = await readJson(request);
  const phone = normalizePhone(body.member_phone);
  const period = String(body.period || '');
  if (!phone) return json({ error: 'invalid_phone' }, 400);
  if (!/^\d{4}-\d{2}$/.test(period)) return json({ error: 'period_must_be_YYYY_MM' }, 400);
  const res = await env.DB.prepare(
    'DELETE FROM payments WHERE member_phone = ? AND period = ?'
  ).bind(phone, period).run();
  return json({ ok: true, deleted: (res.meta && res.meta.changes) || 0 });
}

// ── jobs board ─────────────────────────────────────────────────────────
// A notice board: any approved member posts freely; applications happen on
// WhatsApp via the poster's wa.me link (never in-platform messaging). No
// rate field — money is discussed in chat (owner decision, 2026-07-16).

async function listJobs(env, member) {
  // Member-posted jobs (open + filled-as-social-proof) from approved members.
  const memberJobs = await env.DB.prepare(
    `SELECT j.id, j.poster_phone, j.zone, j.trade, j.skill_level, j.workers,
            j.start_when, j.duration, j.description, j.status, j.created_at,
            m.name AS poster_name, m.business_name AS poster_business, m.is_business AS poster_is_business
     FROM jobs j JOIN members m ON m.phone = j.poster_phone
     WHERE j.status IN ('open','filled') AND m.status = 'approved'`
  ).all();

  // Client-posted jobs, but only ones an admin has approved (moderation gate).
  const clientJobs = await env.DB.prepare(
    `SELECT id, client_name, client_contact, zone, trade, skill_level, workers,
            start_when, duration, description, status, created_at
     FROM client_jobs WHERE status IN ('approved','filled')`
  ).all();

  const jobs = [];
  for (const j of (memberJobs.results || [])) {
    jobs.push({
      id: j.id, source: 'member',
      zone: j.zone, trade: j.trade, skill_level: j.skill_level, workers: j.workers,
      start_when: j.start_when, duration: j.duration, description: j.description,
      status: j.status, created_at: j.created_at,
      poster_name: j.poster_name, poster_business: j.poster_business, poster_is_business: !!j.poster_is_business,
      contact_phone: j.poster_phone,
      mine: j.poster_phone === member.phone,
    });
  }
  for (const j of (clientJobs.results || [])) {
    jobs.push({
      id: j.id, source: 'client',
      zone: j.zone, trade: j.trade, skill_level: j.skill_level, workers: j.workers,
      start_when: j.start_when, duration: j.duration, description: j.description,
      status: j.status === 'approved' ? 'open' : j.status, created_at: j.created_at,
      poster_name: j.client_name, poster_business: null, poster_is_business: false,
      contact_phone: j.client_contact,
      mine: false,
    });
  }
  // Active (open) first, then most recent.
  jobs.sort((a, b) => {
    const ao = a.status === 'open' ? 0 : 1, bo = b.status === 'open' ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
  return json({ jobs });
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
  const notify = notifyZone(env, row, { exclude: member.phone }).catch((e) => console.error('job alert send failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify);

  return json({ job: row }, 201);
}

// Push a "new job in your area" alert to approved members whose area matches
// the job's zone. opts.exclude = a phone to skip (the member poster);
// opts.client = true for client-posted jobs (tweaks the wording). Expired
// subscriptions are pruned.
async function notifyZone(env, job, opts = {}) {
  if (!env.VAPID_PRIVATE) return; // push not configured — never break posting
  const exclude = opts.exclude || '';
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.sub FROM push_subs s
     JOIN members m ON m.phone = s.member_phone
     WHERE m.area = ? AND m.status = 'approved' AND m.phone != ?
     LIMIT ?`
  ).bind(job.zone, exclude, PUSH_MAX_PER_JOB).all();
  if (!results || !results.length) return;

  const trade = job.trade ? job.trade.replace(/_/g, ' ') : 'any trade';
  const title = (opts.client ? 'New client job in ' : 'New job in ') + job.zone;
  const body = job.workers + ' × ' + trade + (job.start_when ? ' · starts ' + job.start_when : '') + ' — tap to view and contact.';

  for (const row of results) {
    let sub;
    try { sub = JSON.parse(row.sub); } catch { continue; }
    const status = await sendWebPush(sub, title, body, env, '/concierge/directory.html#jobs');
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(row.id).run();
    }
  }
}

// Push a message to every admin's subscribed devices (client job requests,
// new member applications, …). Opens `url` on tap. Prunes dead subs.
async function pushToAdmins(env, title, body, url) {
  if (!env.VAPID_PRIVATE) return;
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.sub FROM push_subs s
     JOIN members m ON m.phone = s.member_phone
     WHERE m.role = 'admin' AND m.status = 'approved'
     LIMIT ?`
  ).bind(PUSH_MAX_PER_JOB).all();
  if (!results || !results.length) return;
  for (const row of results) {
    let sub;
    try { sub = JSON.parse(row.sub); } catch { continue; }
    const status = await sendWebPush(sub, title, body, env, url || '/concierge/admin.html');
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(row.id).run();
    }
  }
}

// ── notifications layer (shared) ───────────────────────────────────────
// Every feature writes here; the in-app bell reads it. Web Push is optional
// on top, so members who never granted push still see events in the bell.

const NOTIF_LIST_LIMIT = 50;

// Insert one notification row for a member. Never throws (best-effort).
async function storeNotif(env, phone, n) {
  try {
    await env.DB.prepare(
      `INSERT INTO notifications (member_phone, type, title, body, link) VALUES (?, ?, ?, ?, ?)`
    ).bind(phone, n.type, n.title, n.body || null, n.link || null).run();
  } catch (e) { console.error('storeNotif failed:', e && e.message); }
}

// Push to one specific member's subscribed devices (order placed → vendor,
// order accepted → buyer, …). Prunes dead subs.
async function pushToMember(env, phone, title, body, url) {
  if (!env.VAPID_PRIVATE) return;
  const { results } = await env.DB.prepare(
    `SELECT id, sub FROM push_subs WHERE member_phone = ? LIMIT 20`
  ).bind(phone).all();
  if (!results || !results.length) return;
  for (const row of results) {
    let sub;
    try { sub = JSON.parse(row.sub); } catch { continue; }
    const status = await sendWebPush(sub, title, body, env, url || '/concierge/directory.html');
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(row.id).run();
    }
  }
}

// Store an in-app notification AND fire push — the one-liner every feature uses.
async function notifyMember(env, phone, n) {
  await storeNotif(env, phone, n);
  await pushToMember(env, phone, n.title, n.body || '', n.link ? ('/concierge/directory.html' + n.link) : '/concierge/directory.html');
}

async function listNotifications(env, member) {
  const { results } = await env.DB.prepare(
    `SELECT id, type, title, body, link, read, created_at FROM notifications
     WHERE member_phone = ? ORDER BY id DESC LIMIT ?`
  ).bind(member.phone, NOTIF_LIST_LIMIT).all();
  const u = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM notifications WHERE member_phone = ? AND read = 0`
  ).bind(member.phone).first();
  return json({
    notifications: (results || []).map((n) => ({ ...n, read: !!n.read })),
    unread: (u && u.c) || 0,
  });
}

async function markNotificationsRead(request, env, member) {
  const body = await readJson(request);
  if (Array.isArray(body.ids) && body.ids.length) {
    const ids = body.ids.filter((x) => Number.isInteger(x)).slice(0, 200);
    if (ids.length) {
      const ph = ids.map(() => '?').join(',');
      await env.DB.prepare(`UPDATE notifications SET read = 1 WHERE member_phone = ? AND id IN (${ph})`).bind(member.phone, ...ids).run();
    }
  } else {
    await env.DB.prepare(`UPDATE notifications SET read = 1 WHERE member_phone = ? AND read = 0`).bind(member.phone).run();
  }
  return json({ ok: true });
}

// Public client job request. No account; lands `pending`. Anti-spam is a
// phone-keyed throttle (a valid Ghana number is required to be contacted
// anyway). CAPTCHA/Turnstile is a future hardening if abuse appears.
async function publicPostJob(request, env, ctx) {
  const body = await readJson(request);

  const name = nullableStr(body.client_name);
  if (!name || name.length > 80) return json({ error: 'name_required' }, 400);

  const contact = normalizePhone(body.client_contact);
  if (!contact) return json({ error: 'invalid_phone' }, 400);

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

  const pending = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM client_jobs WHERE client_contact = ? AND status = 'pending'`
  ).bind(contact).first();
  if (pending && pending.c >= CLIENT_JOB_MAX_PENDING_PER_PHONE) return json({ error: 'too_many_pending' }, 429);

  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM client_jobs WHERE client_contact = ? AND created_at >= datetime('now', ?)`
  ).bind(contact, CLIENT_JOB_WINDOW).first();
  if (recent && recent.c >= CLIENT_JOB_MAX_PER_WINDOW) return json({ error: 'too_many_recent' }, 429);

  const r = await env.DB.prepare(
    `INSERT INTO client_jobs (client_name, client_contact, zone, trade, skill_level, workers, start_when, duration, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, contact, zone, trade, skill_level, workers, start_when, duration, description).run();
  const row = await env.DB.prepare('SELECT * FROM client_jobs WHERE id = ?').bind(r.meta.last_row_id).first();

  const trade2 = row.trade ? row.trade.replace(/_/g, ' ') : 'any trade';
  const notify = pushToAdmins(env, 'New client job request',
    row.zone + ' · ' + row.workers + ' × ' + trade2 + ' — review it in admin.').catch((e) => console.error('admin notify failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify);

  return json({ ok: true, id: row.id }, 201);
}

// Public self-service registration. Security-sensitive fields (role, status,
// is_founder) are HARDCODED here — never read from the body — so a public
// caller can only ever create a pending, non-founder member.
async function publicRegister(request, env, ctx) {
  const body = await readJson(request);

  const phone = normalizePhone(body.phone);
  if (!phone) return json({ error: 'invalid_phone' }, 400);

  const name = String(body.name || '').trim();
  if (!name || name.length > 80) return json({ error: 'name_required' }, 400);

  const pin = String(body.pin || '');
  if (!/^\d{5}$/.test(pin)) return json({ error: 'pin_must_be_5_digits' }, 400);

  const specialties = validateSpecialties(body.specialties);
  if (specialties === null) return json({ error: 'invalid_specialties' }, 400);

  const skill_level = validateSkillLevel(body.skill_level);
  if (skill_level === false) return json({ error: 'invalid_skill_level' }, 400);
  const years_experience = validateYears(body.years_experience);
  if (years_experience === false) return json({ error: 'invalid_years' }, 400);
  const availability = validateAvailability(body.availability);
  if (availability === false) return json({ error: 'invalid_availability' }, 400);
  const member_type = validateMemberType(body.member_type);
  if (member_type === false) return json({ error: 'invalid_member_type' }, 400);
  // Carpenters must carry at least one trade; vendors carry none.
  if ((member_type || 'carpenter') === 'carpenter' && JSON.parse(specialties).length === 0) return json({ error: 'invalid_specialties' }, 400);
  const vendor_scale = validateVendorScale(body.vendor_scale);
  if (vendor_scale === false) return json({ error: 'invalid_vendor_scale' }, 400);
  const vendor_categories = validateVendorCategories(body.vendor_categories);
  if (vendor_categories === false) return json({ error: 'invalid_categories' }, 400);
  const vendor_services = validateVendorServices(body.vendor_services);
  if (vendor_services === false) return json({ error: 'invalid_services' }, 400);
  const services_other = servicesOtherVal(body.services_other);
  const coverage_zones = validateCoverageZones(body.coverage_zones);
  if (coverage_zones === false) return json({ error: 'invalid_coverage_zones' }, 400);
  const side_hustles = validateSideHustles(body.side_hustles, await approvedServiceSlugs(env));
  if (side_hustles === false) return json({ error: 'invalid_side_hustles' }, 400);
  const business_phone = bizPhone(body.business_phone);
  if (business_phone === false) return json({ error: 'invalid_business_phone' }, 400);
  const hide_phone = body.hide_phone ? 1 : 0;
  if (hide_phone && !business_phone) return json({ error: 'need_business_phone' }, 400);
  // Tier the applicant chose — founder only while spots remain; otherwise regular.
  // Determines the CHARGE only; founder status is granted by the webhook on payment.
  const wantsFounder = String(body.requested_tier || 'regular') === 'founder';
  const requested_tier = (wantsFounder && (await foundersCount(env)) < FOUNDER_CAP) ? 'founder' : 'regular';

  const existing = await env.DB.prepare('SELECT phone FROM members WHERE phone = ?').bind(phone).first();
  if (existing) return json({ error: 'member_exists' }, 409);

  const pin_hash = await hashPin(pin);
  await env.DB.prepare(
    `INSERT INTO members
       (phone, name, business_name, area, specialties, pin_hash, role, status, is_founder, joined_at,
        skill_level, years_experience, is_business, availability, member_type, stock, vendor_scale, vendor_categories, vendor_services, services_other, coverage_zones, side_hustles, business_phone, hide_phone, requested_tier)
     VALUES (?, ?, ?, ?, ?, ?, 'member', 'pending', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    phone, name, nullableStr(body.business_name), nullableStr(body.area),
    specialties, pin_hash, new Date().toISOString(),
    skill_level, years_experience, body.is_business ? 1 : 0, availability, member_type || 'carpenter', stockVal(body.stock), vendor_scale, vendor_categories, vendor_services, services_other, coverage_zones, side_hustles, business_phone, hide_phone, requested_tier
  ).run();

  const notify = pushToAdmins(env, 'New member registration',
    name + ' · ' + (nullableStr(body.area) || 'no area given') + ' — joining (' + requested_tier + ').').catch((e) => console.error('admin notify failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify);

  // Pay-to-join: start the Paystack transaction and hand back the hosted URL.
  // (If payments aren't configured, fall back to the old application flow.)
  if (env.PAYSTACK_SECRET) {
    const amount = requested_tier === 'founder' ? FOUNDER_FEE_GHS : MONTHLY_FEE_GHS;
    const r = await startPaystack(env, {
      phone, name, period: currentPeriod(), kind: requested_tier === 'founder' ? 'founder' : 'monthly',
      amount, callback_url: PAY_JOIN_CALLBACK_URL,
    });
    if (r.error) return json({ error: r.error, detail: r.detail || null }, r.status || 502);
    return json({ authorization_url: r.authorization_url, reference: r.reference, tier: requested_tier, amount }, 201);
  }
  return json({ ok: true, tier: requested_tier }, 201);
}

async function adminListClientJobs(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM client_jobs WHERE status IN ('pending','approved','filled')
     ORDER BY status = 'pending' DESC, created_at DESC LIMIT 200`
  ).all();
  return json({ jobs: results || [] });
}

async function adminReviewClientJob(request, env, id, ctx) {
  const job = await env.DB.prepare('SELECT * FROM client_jobs WHERE id = ?').bind(id).first();
  if (!job) return json({ error: 'not_found' }, 404);

  const body = await readJson(request);
  const status = String(body.status || '');
  if (!['pending', 'approved', 'rejected', 'filled'].includes(status)) return json({ error: 'invalid_status' }, 400);

  const firstApproval = status === 'approved' && job.status !== 'approved';
  await env.DB.prepare(
    `UPDATE client_jobs SET status = ?, reviewed_at = datetime('now') WHERE id = ?`
  ).bind(status, id).run();

  // Fire zone alerts only when a request is first published to the board.
  if (firstApproval) {
    const notify = notifyZone(env, job, { client: true }).catch((e) => console.error('client job alert failed:', e && e.message));
    if (ctx && ctx.waitUntil) ctx.waitUntil(notify);
  }

  const updated = await env.DB.prepare('SELECT * FROM client_jobs WHERE id = ?').bind(id).first();
  return json({ job: updated });
}

async function adminDeleteClientJob(env, id) {
  const r = await env.DB.prepare('DELETE FROM client_jobs WHERE id = ?').bind(id).run();
  if (!r.meta || r.meta.changes === 0) return json({ error: 'not_found' }, 404);
  return json({ deleted: true });
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

// ── "Buy for me" board ─────────────────────────────────────────────────
// A procurement/errand notice board, twin of the jobs board. A member posts
// materials to be bought & delivered; another member contacts them on
// WhatsApp. No money handled in-platform — budget, runner fee and payment
// method are agreed in chat (owner constraint: the platform is a connector).

// items: JSON array of {name, qty}. Returns a cleaned JSON string, or false.
function validateBuyItems(input) {
  let arr = input;
  if (typeof input === 'string') { try { arr = JSON.parse(input); } catch { return false; } }
  if (!Array.isArray(arr)) return false;
  const clean = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const name = String(it.name == null ? '' : it.name).trim().slice(0, BUY_MAX_TEXT.item);
    if (!name) continue;
    const qty = String(it.qty == null ? '' : it.qty).trim().slice(0, BUY_MAX_TEXT.qty);
    clean.push({ name, qty });
    if (clean.length >= BUY_MAX_ITEMS) break;
  }
  if (!clean.length) return false;
  return JSON.stringify(clean);
}

async function listBuyRequests(env, member) {
  const { results } = await env.DB.prepare(
    `SELECT b.id, b.poster_phone, b.zone, b.items, b.deliver_detail, b.where_to_buy,
            b.budget, b.needed_by, b.notes, b.status, b.created_at,
            m.name AS poster_name, m.business_name AS poster_business,
            m.is_business AS poster_is_business, m.business_phone AS poster_biz_phone
     FROM buy_requests b JOIN members m ON m.phone = b.poster_phone
     WHERE b.status IN ('open','filled') AND m.status = 'approved'`
  ).all();

  const reqs = (results || []).map((b) => ({
    id: b.id, zone: b.zone,
    items: (() => { try { return JSON.parse(b.items) || []; } catch { return []; } })(),
    deliver_detail: b.deliver_detail, where_to_buy: b.where_to_buy,
    budget: b.budget, needed_by: b.needed_by, notes: b.notes,
    status: b.status, created_at: b.created_at,
    poster_name: b.poster_name, poster_business: b.poster_business,
    poster_is_business: !!b.poster_is_business,
    // Respect hide_phone: contact via the business number when one is set.
    contact_phone: b.poster_biz_phone || b.poster_phone,
    mine: b.poster_phone === member.phone,
  }));

  reqs.sort((a, b) => {
    const ao = a.status === 'open' ? 0 : 1, bo = b.status === 'open' ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
  return json({ requests: reqs });
}

async function createBuyRequest(request, env, member, ctx) {
  const body = await readJson(request);

  const zone = nullableStr(body.zone);
  if (!zone || zone.length > BUY_MAX_TEXT.zone) return json({ error: 'zone_required' }, 400);

  const items = validateBuyItems(body.items);
  if (!items) return json({ error: 'items_required' }, 400);

  const deliver_detail = nullableStr(body.deliver_detail);
  if (deliver_detail && deliver_detail.length > BUY_MAX_TEXT.deliver_detail) return json({ error: 'deliver_detail_too_long' }, 400);
  const where_to_buy = nullableStr(body.where_to_buy);
  if (where_to_buy && where_to_buy.length > BUY_MAX_TEXT.where_to_buy) return json({ error: 'where_too_long' }, 400);
  const budget = nullableStr(body.budget);
  if (budget && budget.length > BUY_MAX_TEXT.budget) return json({ error: 'budget_too_long' }, 400);
  const needed_by = nullableStr(body.needed_by);
  if (needed_by && needed_by.length > BUY_MAX_TEXT.needed_by) return json({ error: 'needed_by_too_long' }, 400);
  const notes = nullableStr(body.notes);
  if (notes && notes.length > BUY_MAX_TEXT.notes) return json({ error: 'notes_too_long' }, 400);

  const open = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM buy_requests WHERE poster_phone = ? AND status = 'open'`
  ).bind(member.phone).first();
  if (open && open.c >= BUY_MAX_OPEN_PER_MEMBER) {
    return json({ error: 'too_many_open_requests', limit: BUY_MAX_OPEN_PER_MEMBER }, 400);
  }

  const r = await env.DB.prepare(
    `INSERT INTO buy_requests (poster_phone, zone, items, deliver_detail, where_to_buy, budget, needed_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(member.phone, zone, items, deliver_detail, where_to_buy, budget, needed_by, notes).run();

  const row = await env.DB.prepare('SELECT * FROM buy_requests WHERE id = ?').bind(r.meta.last_row_id).first();

  const notify = notifyBuyZone(env, row, { exclude: member.phone }).catch((e) => console.error('buy alert send failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify);

  return json({ request: row }, 201);
}

async function updateBuyRequest(request, env, member, id) {
  const req = await env.DB.prepare('SELECT poster_phone FROM buy_requests WHERE id = ?').bind(id).first();
  if (!req) return json({ error: 'not_found' }, 404);
  if (req.poster_phone !== member.phone && member.role !== 'admin') return json({ error: 'forbidden' }, 403);

  const body = await readJson(request);
  if (!['open', 'filled'].includes(body.status)) return json({ error: 'invalid_status' }, 400);

  await env.DB.prepare(
    `UPDATE buy_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(body.status, id).run();
  const row = await env.DB.prepare('SELECT * FROM buy_requests WHERE id = ?').bind(id).first();
  return json({ request: row });
}

async function deleteBuyRequest(env, member, id) {
  const req = await env.DB.prepare('SELECT poster_phone FROM buy_requests WHERE id = ?').bind(id).first();
  if (!req) return json({ error: 'not_found' }, 404);
  if (req.poster_phone !== member.phone && member.role !== 'admin') return json({ error: 'forbidden' }, 403);
  await env.DB.prepare('DELETE FROM buy_requests WHERE id = ?').bind(id).run();
  return json({ deleted: true });
}

// Alert the runner pool for a buy request: couriers + members who opted into the
// 'deliveries_errands' side-hustle, whose coverage zones (or home area) include
// the delivery zone. Writes an in-app notification for each (so it lands in the
// bell even without push) and fires push on top.
async function notifyBuyZone(env, req, opts = {}) {
  const exclude = opts.exclude || '';
  const { results } = await env.DB.prepare(
    `SELECT m.phone FROM members m
     WHERE m.status = 'approved' AND m.phone != ?1
       AND (m.member_type = 'courier'
            OR (m.side_hustles IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(m.side_hustles) j WHERE j.value = 'deliveries_errands')))
       AND (m.area = ?2
            OR (m.coverage_zones IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(m.coverage_zones) k WHERE k.value = ?2)))
     LIMIT ?3`
  ).bind(exclude, req.zone, PUSH_MAX_PER_JOB).all();
  if (!results || !results.length) return;

  let firstItem = '';
  try { const items = JSON.parse(req.items) || []; if (items[0]) firstItem = items[0].name; } catch {}
  const title = 'New buy request in ' + req.zone;
  const body = (firstItem ? firstItem : 'Materials') + ' — a member needs this bought & delivered.';

  for (const row of results) {
    await notifyMember(env, row.phone, { type: 'buy_request', title, body, link: '#services' });
  }
}

// ── vendor orders ──────────────────────────────────────────────────────
// A member orders a vendor's LISTED storefront item. References only listed
// items (anti-spam). Vendor gets a bell/push notification; the buyer is
// notified when the vendor accepts. No money handled — coordinated on WhatsApp.

async function createOrder(request, env, buyer, ctx) {
  const body = await readJson(request);
  const handle = normalizePhone(body.vendor_phone);
  if (!handle) return json({ error: 'invalid_vendor' }, 400);
  // Resolve by personal OR business number (a hidden vendor is referenced by biz).
  const vendor = await env.DB.prepare('SELECT phone, name, status FROM members WHERE phone = ? OR business_phone = ?').bind(handle, handle).first();
  if (!vendor || vendor.status !== 'approved') return json({ error: 'vendor_not_found' }, 404);
  const vendorPhone = vendor.phone;
  if (vendorPhone === buyer.phone) return json({ error: 'cannot_order_own' }, 400);

  const itemId = Number(body.item_id);
  if (!Number.isInteger(itemId)) return json({ error: 'item_required' }, 400);
  // References a LISTED item belonging to this vendor.
  const item = await env.DB.prepare('SELECT id, name, price FROM storefront_items WHERE id = ? AND member_phone = ?').bind(itemId, vendorPhone).first();
  if (!item) return json({ error: 'item_not_found' }, 404);

  const qty = (String(body.qty == null ? '' : body.qty).trim().slice(0, ORDER_QTY_MAX)) || '1';
  const deliver_wanted = body.deliver_wanted ? 1 : 0;
  const deliver_to = nullableStr(body.deliver_to);
  if (deliver_wanted && !deliver_to) return json({ error: 'deliver_to_required' }, 400);
  if (deliver_to && deliver_to.length > ORDER_DELIVER_MAX) return json({ error: 'deliver_to_too_long' }, 400);
  const notes = nullableStr(body.notes);
  if (notes && notes.length > ORDER_NOTES_MAX) return json({ error: 'notes_too_long' }, 400);

  const open = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM orders WHERE buyer_phone = ? AND status IN ('new','accepted')`
  ).bind(buyer.phone).first();
  if (open && open.c >= ORDER_MAX_OPEN_PER_BUYER) return json({ error: 'too_many_open_orders', limit: ORDER_MAX_OPEN_PER_BUYER }, 400);

  const items = JSON.stringify([{ item_id: item.id, name: item.name, price: item.price || null, qty }]);
  const r = await env.DB.prepare(
    `INSERT INTO orders (vendor_phone, buyer_phone, items, deliver_wanted, deliver_to, notes) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(vendorPhone, buyer.phone, items, deliver_wanted, deliver_to, notes).run();
  const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(r.meta.last_row_id).first();

  const notif = notifyMember(env, vendorPhone, {
    type: 'order_new', title: 'New order',
    body: (buyer.name || 'A member') + ' ordered ' + qty + ' × ' + item.name + (deliver_wanted ? ' (delivery)' : ''),
    link: '#orders',
  }).catch((e) => console.error('order notify failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notif);

  return json({ order: row }, 201);
}

async function listVendorOrders(env, member) {
  const { results } = await env.DB.prepare(
    `SELECT o.id, o.items, o.deliver_wanted, o.deliver_to, o.notes, o.status, o.created_at,
            b.name AS buyer_name, b.business_name AS buyer_business, b.phone AS buyer_phone, b.business_phone AS buyer_biz_phone
     FROM orders o JOIN members b ON b.phone = o.buyer_phone
     WHERE o.vendor_phone = ? ORDER BY (o.status = 'new') DESC, o.id DESC LIMIT 200`
  ).bind(member.phone).all();
  const orders = (results || []).map((o) => ({
    id: o.id,
    items: (() => { try { return JSON.parse(o.items) || []; } catch { return []; } })(),
    deliver_wanted: !!o.deliver_wanted, deliver_to: o.deliver_to, notes: o.notes,
    status: o.status, created_at: o.created_at,
    buyer_name: o.buyer_name, buyer_business: o.buyer_business,
    contact_phone: o.buyer_biz_phone || o.buyer_phone,
  }));
  return json({ orders });
}

async function updateOrder(request, env, member, id, ctx) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return json({ error: 'not_found' }, 404);
  if (order.vendor_phone !== member.phone && member.role !== 'admin') return json({ error: 'forbidden' }, 403);

  const body = await readJson(request);
  const status = String(body.status || '');
  if (!['new', 'accepted', 'fulfilled', 'declined'].includes(status)) return json({ error: 'invalid_status' }, 400);
  const wasAccepted = order.status === 'accepted';

  await env.DB.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id).run();

  // Alert the buyer the first time the vendor accepts.
  if (status === 'accepted' && !wasAccepted) {
    let itemName = 'your order';
    try { const items = JSON.parse(order.items) || []; if (items[0]) itemName = items[0].name; } catch {}
    const notif = notifyMember(env, order.buyer_phone, {
      type: 'order_accepted', title: 'Order accepted',
      body: (member.business_name || member.name || 'The vendor') + ' accepted your order for ' + itemName + " — they'll be in touch.",
      link: '#sourcing',
    }).catch((e) => console.error('order accept notify failed:', e && e.message));
    if (ctx && ctx.waitUntil) ctx.waitUntil(notif);
  }

  const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return json({ order: row });
}

// ── offered-services catalog ───────────────────────────────────────────
// Curated, admin-moderated vocabulary. Members pick approved entries;
// "suggest a service" adds a pending row an admin approves. We moderate the
// vocabulary, not each member's listing.

async function listServices(env) {
  const { results } = await env.DB.prepare(
    "SELECT slug, label FROM service_catalog WHERE status = 'approved' ORDER BY label COLLATE NOCASE"
  ).all();
  return json({ services: results || [] });
}

async function suggestService(request, env, member, ctx) {
  const body = await readJson(request);
  const label = String(body.label || '').trim().slice(0, SERVICE_LABEL_MAX);
  if (!label) return json({ error: 'label_required' }, 400);
  const slug = slugifyService(label);
  if (!slug) return json({ error: 'label_required' }, 400);

  const existing = await env.DB.prepare('SELECT slug, status FROM service_catalog WHERE slug = ?').bind(slug).first();
  if (existing) return json({ ok: true, slug, status: existing.status, already: true });

  await env.DB.prepare(
    "INSERT INTO service_catalog (slug, label, status, suggested_by) VALUES (?, ?, 'pending', ?)"
  ).bind(slug, label, member.phone).run();

  const notify = pushToAdmins(env, 'New service suggestion', (member.name || 'A member') + ' suggested "' + label + '" — review in admin.').catch((e) => console.error('service suggest notify failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify);

  return json({ ok: true, slug, status: 'pending' }, 201);
}

async function adminListServices(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, label, status, suggested_by, created_at FROM service_catalog
     ORDER BY (status = 'pending') DESC, label COLLATE NOCASE`
  ).all();
  return json({ services: results || [] });
}

async function adminUpdateService(request, env, id, ctx) {
  const svc = await env.DB.prepare('SELECT * FROM service_catalog WHERE id = ?').bind(id).first();
  if (!svc) return json({ error: 'not_found' }, 404);
  const body = await readJson(request);
  const fields = {};
  if ('status' in body) {
    if (!['approved', 'pending'].includes(body.status)) return json({ error: 'invalid_status' }, 400);
    fields.status = body.status;
  }
  if ('label' in body) {
    const label = String(body.label || '').trim().slice(0, SERVICE_LABEL_MAX);
    if (!label) return json({ error: 'label_required' }, 400);
    fields.label = label;
  }
  const keys = Object.keys(fields);
  if (keys.length) {
    const set = keys.map((k) => `${k} = ?`).join(', ');
    await env.DB.prepare(`UPDATE service_catalog SET ${set} WHERE id = ?`).bind(...keys.map((k) => fields[k]), id).run();
  }
  // On approval, tell the suggester their service is now live.
  if (fields.status === 'approved' && svc.status !== 'approved' && svc.suggested_by) {
    const notify = notifyMember(env, svc.suggested_by, {
      type: 'service_approved', title: 'Service added',
      body: 'Your suggested service "' + (fields.label || svc.label) + '" is now live — add it in My profile.',
      link: '#directory',
    }).catch((e) => console.error('service approve notify failed:', e && e.message));
    if (ctx && ctx.waitUntil) ctx.waitUntil(notify);
  }
  const row = await env.DB.prepare('SELECT * FROM service_catalog WHERE id = ?').bind(id).first();
  return json({ service: row });
}

async function adminDeleteService(env, id) {
  const svc = await env.DB.prepare('SELECT slug FROM service_catalog WHERE id = ?').bind(id).first();
  if (!svc) return json({ error: 'not_found' }, 404);
  await env.DB.prepare('DELETE FROM service_catalog WHERE id = ?').bind(id).run();
  return json({ deleted: true });
}

// ── feature suggestion box ─────────────────────────────────────────────
// Members propose platform features from the Support tab; admin reviews.

async function createSuggestion(request, env, member, ctx) {
  const body = await readJson(request);
  const text = String(body.text || '').trim().slice(0, SUGGESTION_MAX);
  if (!text) return json({ error: 'text_required' }, 400);
  const open = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM suggestions WHERE member_phone = ? AND status = 'new'`
  ).bind(member.phone).first();
  if (open && open.c >= SUGGESTION_MAX_OPEN_PER_MEMBER) return json({ error: 'too_many_open', limit: SUGGESTION_MAX_OPEN_PER_MEMBER }, 400);

  const r = await env.DB.prepare('INSERT INTO suggestions (member_phone, text) VALUES (?, ?)').bind(member.phone, text).run();
  const row = await env.DB.prepare('SELECT id, text, status, created_at FROM suggestions WHERE id = ?').bind(r.meta.last_row_id).first();

  const notify = pushToAdmins(env, 'New feature suggestion', (member.name || 'A member') + ': ' + text.slice(0, 80)).catch((e) => console.error('suggestion notify failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify);
  return json({ suggestion: row }, 201);
}

async function listMySuggestions(env, member) {
  const { results } = await env.DB.prepare(
    'SELECT id, text, status, created_at FROM suggestions WHERE member_phone = ? ORDER BY id DESC LIMIT 50'
  ).bind(member.phone).all();
  return json({ suggestions: results || [] });
}

async function adminListSuggestions(env) {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.text, s.status, s.created_at, s.member_phone, m.name AS member_name
     FROM suggestions s JOIN members m ON m.phone = s.member_phone
     ORDER BY (s.status = 'new') DESC, s.id DESC LIMIT 500`
  ).all();
  return json({ suggestions: results || [] });
}

async function adminUpdateSuggestion(request, env, id, ctx) {
  const sugg = await env.DB.prepare('SELECT * FROM suggestions WHERE id = ?').bind(id).first();
  if (!sugg) return json({ error: 'not_found' }, 404);
  const body = await readJson(request);
  const status = String(body.status || '');
  if (!['new', 'seen', 'planned', 'done', 'declined'].includes(status)) return json({ error: 'invalid_status' }, 400);
  await env.DB.prepare('UPDATE suggestions SET status = ? WHERE id = ?').bind(status, id).run();
  // Nudge the suggester on the good outcomes.
  if ((status === 'planned' || status === 'done') && sugg.status !== status) {
    const word = status === 'done' ? 'shipped' : 'planned';
    const notify = notifyMember(env, sugg.member_phone, {
      type: 'suggestion', title: 'Your suggestion is ' + word,
      body: '"' + String(sugg.text).slice(0, 70) + '" — thanks for the idea!',
      link: '#support',
    }).catch((e) => console.error('suggestion status notify failed:', e && e.message));
    if (ctx && ctx.waitUntil) ctx.waitUntil(notify);
  }
  const row = await env.DB.prepare('SELECT * FROM suggestions WHERE id = ?').bind(id).first();
  return json({ suggestion: row });
}

async function adminDeleteSuggestion(env, id) {
  const r = await env.DB.prepare('DELETE FROM suggestions WHERE id = ?').bind(id).run();
  if (!r.meta || r.meta.changes === 0) return json({ error: 'not_found' }, 404);
  return json({ deleted: true });
}

// ── safety check-in (lone-worker call-outs) ────────────────────────────
// v1 relays through admins: an overdue call-out alerts every admin (push +
// bell) with the member's pin + emergency contact. SMS is a later gated add.

// Store + push a notification to every approved admin.
async function notifyAdmins(env, n) {
  const { results } = await env.DB.prepare("SELECT phone FROM members WHERE role = 'admin' AND status = 'approved'").all();
  for (const r of (results || [])) await notifyMember(env, r.phone, n);
}

function calloutRow(c) {
  return {
    id: c.id, client_name: c.client_name, client_phone: c.client_phone, location: c.location,
    lat: c.lat, lng: c.lng, notes: c.notes, expected_back: c.expected_back, status: c.status,
    created_at: c.created_at, arrived_at: c.arrived_at, checked_out_at: c.checked_out_at, alerted_at: c.alerted_at,
  };
}

async function createCallout(request, env, member) {
  const body = await readJson(request);
  const hours = Number(body.hours);
  if (!isFinite(hours) || hours < 0.25 || hours > CALLOUT_MAX_HOURS) return json({ error: 'invalid_duration' }, 400);
  const location = nullableStr(body.location);
  if (!location) return json({ error: 'location_required' }, 400);
  if (location.length > CALLOUT_TEXT.location) return json({ error: 'location_too_long' }, 400);
  const client_name = (nullableStr(body.client_name) || '').slice(0, CALLOUT_TEXT.name) || null;
  const client_phone = body.client_phone ? (normalizePhone(body.client_phone) || String(body.client_phone).trim().slice(0, CALLOUT_TEXT.phone)) : null;
  const notes = (nullableStr(body.notes) || '').slice(0, CALLOUT_TEXT.notes) || null;

  // One open call-out at a time (you're on one job).
  const open = await env.DB.prepare(
    `SELECT id FROM callouts WHERE member_phone = ? AND status IN ('active','arrived') LIMIT 1`
  ).bind(member.phone).first();
  if (open) return json({ error: 'callout_active', id: open.id }, 409);

  const r = await env.DB.prepare(
    `INSERT INTO callouts (member_phone, client_name, client_phone, location, notes, expected_back)
     VALUES (?, ?, ?, ?, ?, datetime('now', ?))`
  ).bind(member.phone, client_name, client_phone, location, notes, '+' + Math.round(hours * 60) + ' minutes').run();
  const row = await env.DB.prepare('SELECT * FROM callouts WHERE id = ?').bind(r.meta.last_row_id).first();
  return json({ callout: calloutRow(row) }, 201);
}

async function listMyCallouts(env, member) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM callouts WHERE member_phone = ? ORDER BY id DESC LIMIT 30'
  ).bind(member.phone).all();
  return json({ callouts: (results || []).map(calloutRow) });
}

async function updateCallout(request, env, member, id) {
  const c = await env.DB.prepare('SELECT * FROM callouts WHERE id = ?').bind(id).first();
  if (!c) return json({ error: 'not_found' }, 404);
  if (c.member_phone !== member.phone) return json({ error: 'forbidden' }, 403);
  const body = await readJson(request);
  const action = String(body.action || '');

  if (action === 'arrive') {
    let lat = null, lng = null;
    if (body.lat != null && body.lng != null) {
      lat = Number(body.lat); lng = Number(body.lng);
      if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) { lat = null; lng = null; }
    }
    await env.DB.prepare(`UPDATE callouts SET status = 'arrived', arrived_at = datetime('now'), lat = ?, lng = ? WHERE id = ?`).bind(lat, lng, id).run();
  } else if (action === 'safe') {
    await env.DB.prepare(`UPDATE callouts SET status = 'safe', checked_out_at = datetime('now') WHERE id = ?`).bind(id).run();
  } else if (action === 'cancel') {
    await env.DB.prepare(`UPDATE callouts SET status = 'cancelled', checked_out_at = datetime('now') WHERE id = ?`).bind(id).run();
  } else if (action === 'extend') {
    const hours = Number(body.hours);
    if (!isFinite(hours) || hours < 0.25 || hours > CALLOUT_MAX_HOURS) return json({ error: 'invalid_duration' }, 400);
    // Extend from now; also lifts an 'alerted' one back to arrived (they're OK).
    const back = c.status === 'arrived' || c.status === 'active' || c.status === 'alerted' ? 'arrived' : c.status;
    await env.DB.prepare(`UPDATE callouts SET expected_back = datetime('now', ?), status = ? WHERE id = ?`).bind('+' + Math.round(hours * 60) + ' minutes', back, id).run();
  } else {
    return json({ error: 'invalid_action' }, 400);
  }
  const row = await env.DB.prepare('SELECT * FROM callouts WHERE id = ?').bind(id).first();
  return json({ callout: calloutRow(row) });
}

async function adminListCallouts(env) {
  const { results } = await env.DB.prepare(
    `SELECT c.*, m.name AS member_name, m.business_phone AS member_biz_phone,
            m.emergency_name, m.emergency_phone
     FROM callouts c JOIN members m ON m.phone = c.member_phone
     ORDER BY (c.status IN ('active','arrived','alerted')) DESC, c.id DESC LIMIT 300`
  ).all();
  return json({ callouts: (results || []).map((c) => ({
    ...calloutRow(c),
    member_name: c.member_name,
    member_phone: c.member_phone,
    member_contact: c.member_biz_phone || c.member_phone,
    emergency_name: c.emergency_name,
    emergency_phone: c.emergency_phone,
  })) });
}

// Cron: flag call-outs past expected_back + grace, and alert admins.
async function scanOverdueCallouts(env) {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.location, c.member_phone, m.name AS member_name
     FROM callouts c JOIN members m ON m.phone = c.member_phone
     WHERE c.status IN ('active','arrived')
       AND datetime(c.expected_back, ?) < datetime('now')
     LIMIT 100`
  ).bind('+' + CALLOUT_GRACE_MIN + ' minutes').all();
  if (!results || !results.length) return;
  for (const c of results) {
    await env.DB.prepare(`UPDATE callouts SET status = 'alerted', alerted_at = datetime('now') WHERE id = ?`).bind(c.id).run();
    await notifyAdmins(env, {
      type: 'safety', title: '⚠ Safety: member overdue',
      body: (c.member_name || 'A member') + ' is OVERDUE from a call-out' + (c.location ? ' at ' + c.location : '') + '. Open the Safety monitor in admin to check on them.',
      link: '#directory',
    });
  }
}

// ── payments (Paystack, hosted checkout, one-time per period) ──────────
// The SECRET key is a Worker secret the OWNER provisions; this code never sees
// it in source. Flow: /api/pay/init (server initialises + returns Paystack's
// hosted URL) → member pays → signed webhook confirms → payments row written.

function currentPeriod() { return new Date().toISOString().slice(0, 7); } // YYYY-MM
function memberEmail(phone) { return phone + '@members.neewoodygh.com'; } // Paystack requires an email; members are phone-only

async function foundersCount(env) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS c FROM members WHERE is_founder = 1').first();
  return (r && r.c) || 0;
}
async function founderSpots(env) {
  const n = await foundersCount(env);
  return json({ founders: n, cap: FOUNDER_CAP, remaining: Math.max(0, FOUNDER_CAP - n), fee: FOUNDER_FEE_GHS, monthly: MONTHLY_FEE_GHS });
}
// What a member owes right now: a founder-intent member who hasn't been granted
// founder yet (and there are spots) pays the one-time GHS 100; everyone else the
// GHS 50 month. Returns { kind, amount }.
async function chargeFor(env, member) {
  if (member.requested_tier === 'founder' && !member.is_founder && (await foundersCount(env)) < FOUNDER_CAP) {
    return { kind: 'founder', amount: FOUNDER_FEE_GHS };
  }
  return { kind: 'monthly', amount: MONTHLY_FEE_GHS };
}

// Create a payment_intent + initialize a Paystack transaction. Shared by the
// authed pay flow and the pay-to-join registration flow. Returns
// { authorization_url, reference } or { error, status }.
async function startPaystack(env, opts) {
  const { phone, name, period, kind, amount, callback_url } = opts;
  const reference = 'NWD-' + phone + '-' + period + '-' + Math.random().toString(36).slice(2, 8);
  await env.DB.prepare(
    `INSERT INTO payment_intents (reference, member_phone, period, amount_ghs, kind) VALUES (?, ?, ?, ?, ?)`
  ).bind(reference, phone, period, amount, kind).run();
  let res;
  try {
    res = await fetch(PAYSTACK_BASE + '/transaction/initialize', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.PAYSTACK_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: memberEmail(phone), amount: amount * 100, currency: 'GHS',
        reference, callback_url, channels: ['mobile_money', 'card'],
        metadata: { phone, period, name: name || '' },
      }),
    });
  } catch (e) { return { error: 'paystack_unreachable', status: 502 }; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status || !data.data || !data.data.authorization_url) {
    return { error: 'paystack_init_failed', detail: (data && data.message) || null, status: 502 };
  }
  return { authorization_url: data.data.authorization_url, reference };
}

async function hmacSha512Hex(key, msg) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Membership standing for the CURRENT period. Admins + lifetime founders are
// exempt (never billed); everyone else is paid iff a payments row exists.
async function membershipStatus(env, m) {
  const period = currentPeriod();
  if (m.role === 'admin') return { paid: true, exempt: 'admin', period };
  if (m.is_founder) return { paid: true, exempt: 'founder', period };
  const row = await env.DB.prepare('SELECT 1 AS x FROM payments WHERE member_phone = ? AND period = ?').bind(m.phone, period).first();
  const charge = await chargeFor(env, m);
  return {
    paid: !!row, period,
    amount_due: charge.amount, kind: charge.kind,
    join: m.status !== 'approved',              // pending → hard "pay to join" gate
    lapsed: m.status === 'approved' && !row,    // approved but this month unpaid → lockout
    configured: !!env.PAYSTACK_SECRET,
  };
}

async function getMe(env, m) {
  return json({ member: sanitize(m), membership: await membershipStatus(env, m) });
}

async function payInit(request, env, member) {
  if (!env.PAYSTACK_SECRET) return json({ error: 'payments_not_configured' }, 503);
  if (member.role === 'admin' || member.is_founder) return json({ error: 'no_payment_due' }, 400);

  const period = currentPeriod();
  // A monthly member who already paid this period owes nothing (founder one-time
  // isn't period-gated — a founder-intent member with no founder status still owes).
  const charge = await chargeFor(env, member);
  if (charge.kind === 'monthly') {
    const existing = await env.DB.prepare('SELECT 1 AS x FROM payments WHERE member_phone = ? AND period = ?').bind(member.phone, period).first();
    if (existing && member.status === 'approved') return json({ error: 'already_paid', period }, 409);
  }

  const r = await startPaystack(env, {
    phone: member.phone, name: member.name, period, kind: charge.kind, amount: charge.amount,
    callback_url: PAY_CALLBACK_URL,
  });
  if (r.error) return json({ error: r.error, detail: r.detail || null }, r.status || 502);
  return json({ authorization_url: r.authorization_url, reference: r.reference });
}

// Apply a confirmed payment (idempotent): mark the intent paid, write the
// canonical payments row, approve a pending member, grant founder if it was a
// founder-tier payment, and notify. Shared by the webhook AND verify-on-return.
async function applyPaidIntent(env, intent, reference, ctx) {
  if (!intent || intent.status === 'paid') return; // unknown or already handled
  await env.DB.prepare(`UPDATE payment_intents SET status = 'paid', paid_at = datetime('now') WHERE reference = ?`).bind(reference).run();
  await env.DB.prepare(
    `INSERT INTO payments (member_phone, period, amount_ghs, momo_ref)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(member_phone, period)
     DO UPDATE SET amount_ghs = excluded.amount_ghs, momo_ref = excluded.momo_ref, recorded_at = datetime('now')`
  ).bind(intent.member_phone, intent.period, intent.amount_ghs, reference).run();
  // Pay-to-join: approve a pending member (never re-open a suspended one).
  await env.DB.prepare(`UPDATE members SET status = 'approved' WHERE phone = ? AND status = 'pending'`).bind(intent.member_phone).run();
  if (intent.kind === 'founder') {
    await env.DB.prepare('UPDATE members SET is_founder = 1 WHERE phone = ?').bind(intent.member_phone).run();
  }
  const notif = notifyMember(env, intent.member_phone, {
    type: 'payment', title: 'Payment received',
    body: 'Your GHS ' + intent.amount_ghs + ' membership for ' + intent.period + ' is confirmed. Thank you!',
    link: '#directory',
  }).catch((e) => console.error('payment notify failed:', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(notif);
}

async function payWebhook(request, env, ctx) {
  const raw = await request.text();
  if (!env.PAYSTACK_SECRET) return json({ error: 'not_configured' }, 503);
  const sig = request.headers.get('x-paystack-signature') || '';
  const expected = await hmacSha512Hex(env.PAYSTACK_SECRET, raw);
  if (sig !== expected) return json({ error: 'bad_signature' }, 401);

  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_body' }, 400); }
  if (!body || body.event !== 'charge.success' || !body.data) return json({ ok: true });

  const reference = String(body.data.reference || '');
  const intent = await env.DB.prepare('SELECT * FROM payment_intents WHERE reference = ?').bind(reference).first();
  await applyPaidIntent(env, intent, reference, ctx);

  return json({ ok: true });
}

// Verify a transaction on return from Paystack (belt-and-braces so we never rely
// on the webhook alone). Safe to be public + keyed by reference: it only ever
// applies what Paystack itself confirms as 'success', and is idempotent.
async function payVerify(request, env, ctx) {
  if (!env.PAYSTACK_SECRET) return json({ error: 'not_configured' }, 503);
  const body = await readJson(request);
  const reference = String(body.reference || '').trim();
  if (!/^NWD-[\w-]+$/.test(reference)) return json({ error: 'bad_reference' }, 400);
  const intent = await env.DB.prepare('SELECT * FROM payment_intents WHERE reference = ?').bind(reference).first();
  if (!intent) return json({ error: 'not_found' }, 404);
  if (intent.status === 'paid') return json({ ok: true, status: 'paid' });
  let res;
  try {
    res = await fetch(PAYSTACK_BASE + '/transaction/verify/' + encodeURIComponent(reference), {
      headers: { 'Authorization': 'Bearer ' + env.PAYSTACK_SECRET },
    });
  } catch (e) { return json({ error: 'paystack_unreachable' }, 502); }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.status && data.data && data.data.status === 'success') {
    await applyPaidIntent(env, intent, reference, ctx);
    return json({ ok: true, status: 'paid' });
  }
  return json({ ok: false, status: (data && data.data && data.data.status) || 'pending' });
}

// ── pricing tool (per-member config + quotes) ──────────────────────────
const PRICING_CONFIG_MAX_BYTES = 128 * 1024;
const QUOTE_MAX_PER_MEMBER = 200;
const QUOTE_MAX_BYTES = 128 * 1024;
const QUOTE_NAME_MAX = 100;
const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined'];

function safeJsonStr(v, max) {
  let s; try { s = JSON.stringify(v); } catch { return null; }
  if (!s || s === 'null' || typeof v !== 'object') return null;
  if (s.length > max) return 'TOO_LARGE';
  return s;
}

async function getPricingConfig(env, member) {
  const row = await env.DB.prepare('SELECT config, updated_at FROM pricing_configs WHERE member_phone = ?').bind(member.phone).first();
  if (!row) return json({ config: null });
  let config; try { config = JSON.parse(row.config); } catch { config = null; }
  return json({ config, updated_at: row.updated_at });
}

async function savePricingConfig(request, env, member) {
  const body = await readJson(request);
  const s = safeJsonStr(body.config, PRICING_CONFIG_MAX_BYTES);
  if (s === null) return json({ error: 'config_required' }, 400);
  if (s === 'TOO_LARGE') return json({ error: 'config_too_large' }, 400);
  await env.DB.prepare(
    `INSERT INTO pricing_configs (member_phone, config) VALUES (?, ?)
     ON CONFLICT(member_phone) DO UPDATE SET config = excluded.config, updated_at = datetime('now')`
  ).bind(member.phone, s).run();
  return json({ ok: true });
}

// Quotes are stored as one bulk JSON array per member (matches the tool's
// load-all / save-all model). Cap the whole blob.
const QUOTES_BLOB_MAX_BYTES = 512 * 1024;

async function getQuotes(env, member) {
  const row = await env.DB.prepare('SELECT quotes FROM pricing_configs WHERE member_phone = ?').bind(member.phone).first();
  let quotes = [];
  if (row && row.quotes) { try { const a = JSON.parse(row.quotes); if (Array.isArray(a)) quotes = a; } catch {} }
  return json({ quotes });
}

async function saveQuotes(request, env, member) {
  const body = await readJson(request);
  const arr = Array.isArray(body) ? body : body.quotes;
  if (!Array.isArray(arr)) return json({ error: 'quotes_required' }, 400);
  const s = JSON.stringify(arr);
  if (s.length > QUOTES_BLOB_MAX_BYTES) return json({ error: 'quotes_too_large' }, 400);
  await env.DB.prepare(
    `INSERT INTO pricing_configs (member_phone, config, quotes) VALUES (?, '{}', ?)
     ON CONFLICT(member_phone) DO UPDATE SET quotes = excluded.quotes, updated_at = datetime('now')`
  ).bind(member.phone, s).run();
  return json({ ok: true });
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

// ── vendor storefront (structured items + one R2 image each) ────────────
// Vendors list what they sell; carpenters don't use this. Bounded per member.
// image_key stores the display URL (?v=timestamp for cache-busting on re-upload),
// like photo_url; the R2 object key is derived from phone+id.
const STOREFRONT_MAX = 12;
const ITEM_NAME_MAX = 80, ITEM_DESC_MAX = 500, ITEM_PRICE_MAX = 40;
function storeImgKey(phone, id) { return `concierge/storefront/${phone}/${id}.jpg`; }
function storefrontRow(r) {
  return { id: r.id, name: r.name, description: r.description, price: r.price, image: r.image_key || null };
}
function itemFields(body) {
  const name = String(body.name || '').trim();
  if (!name) return { error: 'name_required' };
  return {
    name: name.slice(0, ITEM_NAME_MAX),
    description: body.description == null ? null : (String(body.description).trim().slice(0, ITEM_DESC_MAX) || null),
    price: body.price == null ? null : (String(body.price).trim().slice(0, ITEM_PRICE_MAX) || null),
  };
}

async function listMyStorefront(env, phone) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, description, price, image_key FROM storefront_items
     WHERE member_phone = ? ORDER BY sort, id`
  ).bind(phone).all();
  return json({ items: (results || []).map(storefrontRow) });
}

async function getVendorStorefront(env, phone) {
  // Accept either the personal phone or the business number as the handle —
  // members who hide their personal number are referenced by business_phone.
  const m = await env.DB.prepare('SELECT phone, status FROM members WHERE phone = ? OR business_phone = ?').bind(phone, phone).first();
  if (!m || m.status !== 'approved') return json({ error: 'not_found' }, 404);
  const { results } = await env.DB.prepare(
    `SELECT id, name, description, price, image_key FROM storefront_items
     WHERE member_phone = ? ORDER BY sort, id`
  ).bind(m.phone).all();
  return json({ items: (results || []).map(storefrontRow) });
}

async function createStorefrontItem(request, env, phone) {
  const body = await readJson(request);
  const f = itemFields(body);
  if (f.error) return json({ error: f.error }, 400);
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM storefront_items WHERE member_phone = ?').bind(phone).first();
  if ((c && c.n) >= STOREFRONT_MAX) return json({ error: 'too_many_items', max: STOREFRONT_MAX }, 409);
  const r = await env.DB.prepare(
    'INSERT INTO storefront_items (member_phone, name, description, price) VALUES (?, ?, ?, ?)'
  ).bind(phone, f.name, f.description, f.price).run();
  const row = await env.DB.prepare('SELECT id, name, description, price, image_key FROM storefront_items WHERE id = ?').bind(r.meta.last_row_id).first();
  return json({ item: storefrontRow(row) }, 201);
}

async function updateStorefrontItem(request, env, phone, id) {
  const owned = await env.DB.prepare('SELECT id FROM storefront_items WHERE id = ? AND member_phone = ?').bind(id, phone).first();
  if (!owned) return json({ error: 'not_found' }, 404);
  const f = itemFields(await readJson(request));
  if (f.error) return json({ error: f.error }, 400);
  await env.DB.prepare('UPDATE storefront_items SET name = ?, description = ?, price = ? WHERE id = ? AND member_phone = ?')
    .bind(f.name, f.description, f.price, id, phone).run();
  const row = await env.DB.prepare('SELECT id, name, description, price, image_key FROM storefront_items WHERE id = ?').bind(id).first();
  return json({ item: storefrontRow(row) });
}

async function deleteStorefrontItem(env, phone, id) {
  const owned = await env.DB.prepare('SELECT id FROM storefront_items WHERE id = ? AND member_phone = ?').bind(id, phone).first();
  if (!owned) return json({ error: 'not_found' }, 404);
  await env.MEDIA.delete(storeImgKey(phone, id)).catch(() => {});
  await env.DB.prepare('DELETE FROM storefront_items WHERE id = ? AND member_phone = ?').bind(id, phone).run();
  return json({ ok: true });
}

async function uploadStorefrontPhoto(request, env, phone, id) {
  const owned = await env.DB.prepare('SELECT id FROM storefront_items WHERE id = ? AND member_phone = ?').bind(id, phone).first();
  if (!owned) return json({ error: 'not_found' }, 404);
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('image/jpeg')) return json({ error: 'invalid_image' }, 400);
  const buf = await request.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 2));
  if (buf.byteLength < 128 || head[0] !== 0xff || head[1] !== 0xd8) return json({ error: 'invalid_image' }, 400);
  if (buf.byteLength > PHOTO_MAX_BYTES) return json({ error: 'photo_too_large', max_kb: 300 }, 413);
  await env.MEDIA.put(storeImgKey(phone, id), buf, { httpMetadata: { contentType: 'image/jpeg' } });
  const url = `${new URL(request.url).origin}/api/media/storefront/${phone}/${id}.jpg?v=${Date.now()}`;
  await env.DB.prepare('UPDATE storefront_items SET image_key = ? WHERE id = ? AND member_phone = ?').bind(url, id, phone).run();
  const row = await env.DB.prepare('SELECT id, name, description, price, image_key FROM storefront_items WHERE id = ?').bind(id).first();
  return json({ item: storefrontRow(row) }, 201);
}

async function deleteStorefrontPhoto(env, phone, id) {
  await env.MEDIA.delete(storeImgKey(phone, id)).catch(() => {});
  await env.DB.prepare('UPDATE storefront_items SET image_key = NULL WHERE id = ? AND member_phone = ?').bind(id, phone).run();
  return json({ ok: true });
}

async function serveStorefrontPhoto(env, request, phone, id) {
  const obj = await env.MEDIA.get(storeImgKey(phone, id));
  if (!obj) return json({ error: 'not_found' }, 404);
  const etag = obj.httpEtag;
  if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { 'ETag': etag } });
  return new Response(obj.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'ETag': etag } });
}

// ── Web Push send (RFC 8291 aes128gcm + RFC 8292 VAPID) ────────────────
// Ported from the proven implementation in the dispatch worker (worker.js);
// dispatch itself and its keys are untouched — Concierge signs with its own
// VAPID secrets. Returns the push service's HTTP status (0 on network error)
// so callers can prune 404/410 (expired) subscriptions.

async function sendWebPush(subscription, title, body, env, url) {
  try {
    const payload = JSON.stringify({ title, body, icon: '/images/logo.png', url: url || '/concierge/directory.html#jobs' });
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

async function withAuth(request, env, handler, opts) {
  const member = await authenticate(request, env);
  if (!member) return json({ error: 'unauthorized' }, 401);
  // Pay-to-join gate: suspended always blocked; pending (unpaid) members can only
  // reach allow-listed routes (their own profile + starting a payment) until the
  // payment webhook approves them. Everything else is approved-members-only.
  if (member.status === 'suspended') return json({ error: 'account_suspended' }, 403);
  if (member.status !== 'approved' && !(opts && opts.allowPending)) {
    return json({ error: 'payment_required' }, 403);
  }
  return handler(member);
}

async function withAdmin(request, env, handler) {
  const member = await authenticate(request, env);
  if (!member) return json({ error: 'unauthorized' }, 401);
  if (member.role !== 'admin') return json({ error: 'forbidden' }, 403);
  return handler(member);
}

// Approved AND paid-for-the-current-period. Gates the member benefits (directory,
// jobs, services, new saves). Lapsed approved members get 403 renew_required —
// they keep read access to their own saved data via the plain withAuth routes.
async function withPaid(request, env, handler) {
  const member = await authenticate(request, env);
  if (!member) return json({ error: 'unauthorized' }, 401);
  if (member.status === 'suspended') return json({ error: 'account_suspended' }, 403);
  if (member.status !== 'approved') return json({ error: 'payment_required' }, 403);
  if (member.role !== 'admin' && !member.is_founder) {
    const row = await env.DB.prepare('SELECT 1 AS x FROM payments WHERE member_phone = ? AND period = ?').bind(member.phone, currentPeriod()).first();
    if (!row) return json({ error: 'renew_required' }, 403);
  }
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

// Returns a cleaned JSON array string ('[]' when none/empty — valid, since
// only carpenters require ≥1 trade; vendors carry none). null = malformed input.
// Callers enforce the carpenter "at least one" rule where member_type is known.
function validateSpecialties(input) {
  if (input == null) return '[]';
  let arr = input;
  if (typeof input === 'string') {
    try { arr = JSON.parse(input); } catch { arr = input.split(',').map((s) => s.trim()); }
  }
  if (!Array.isArray(arr)) return null;
  const clean = [...new Set(arr.map((s) => String(s).trim()).filter((s) => SPECIALTIES.includes(s)))];
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

// null = not provided (caller defaults to 'carpenter'); false = invalid.
function validateMemberType(v) {
  if (v == null || v === '') return null;
  return MEMBER_TYPES.includes(String(v)) ? String(v) : false;
}

function validateVendorScale(v) {
  if (v == null || v === '') return null;
  return VENDOR_SCALES.includes(String(v)) ? String(v) : false;
}

// Returns a JSON string of cleaned category keys ('[]' if none); false if the
// input is present but not an array. Optional — vendors needn't set categories.
function validateVendorCategories(input) {
  if (input == null) return '[]';
  if (!Array.isArray(input)) return false;
  return JSON.stringify(input.filter((s) => VENDOR_CATEGORIES.includes(String(s))));
}

// Vendor services ("what they do"): curated keys, capped. '[]' if none; false
// if present-but-not-array. Optional.
function validateVendorServices(input) {
  if (input == null) return '[]';
  if (!Array.isArray(input)) return false;
  const clean = [...new Set(input.map((s) => String(s)).filter((s) => VENDOR_SERVICES.includes(s)))].slice(0, VENDOR_SERVICES_MAX);
  return JSON.stringify(clean);
}

// Free-text "other services" line — trimmed + length-capped. null when empty.
function servicesOtherVal(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s.slice(0, SERVICES_OTHER_MAX);
}

// Coverage zones (courier/runner) — JSON array of non-empty zone strings, capped.
// '[]' if none; false if present-but-not-array. Zone vocabulary is frontend-only.
function validateCoverageZones(input) {
  if (input == null) return '[]';
  if (!Array.isArray(input)) return false;
  const clean = [...new Set(input.map((s) => String(s == null ? '' : s).trim()).filter(Boolean).map((s) => s.slice(0, ZONE_NAME_MAX)))].slice(0, COVERAGE_MAX_ZONES);
  return JSON.stringify(clean);
}

// Offered services — JSON array of slugs, filtered to the approved catalog.
// '[]' if none; false if present-but-not-array. Caller passes the allowed slugs.
function validateSideHustles(input, allowed) {
  if (input == null) return '[]';
  if (!Array.isArray(input)) return false;
  const ok = allowed || [];
  return JSON.stringify([...new Set(input.map((s) => String(s)).filter((s) => ok.indexOf(s) >= 0))]);
}
async function approvedServiceSlugs(env) {
  const { results } = await env.DB.prepare("SELECT slug FROM service_catalog WHERE status = 'approved'").all();
  return (results || []).map((r) => r.slug);
}
function slugifyService(label) {
  return String(label || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

// Social links — JSON object {platform: url} over the fixed key set. Values are
// normalised to https:// and must look like a URL; malformed entries are dropped
// (never fails the whole save). Only http(s) — blocks javascript:/data: URIs.
// Returns a JSON string ('{}' if none), or false if the input isn't an object.
function validateSocials(input) {
  if (input == null) return '{}';
  if (typeof input !== 'object' || Array.isArray(input)) return false;
  const out = {};
  for (const k of SOCIAL_KEYS) {
    let v = input[k];
    if (v == null) continue;
    v = String(v).trim();
    if (!v) continue;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
    if (v.length > SOCIAL_URL_MAX) continue;
    if (!/^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(v)) continue; // must look like http(s)://host.tld…
    out[k] = v;
  }
  return JSON.stringify(out);
}

// Optional business/call number. null = cleared; false = invalid; else 233…
function bizPhone(v) {
  if (v == null || v === '') return null;
  const p = normalizePhone(v);
  return p || false;
}

function parseSpec(text) {
  try { const a = JSON.parse(text); return Array.isArray(a) ? a : []; } catch { return []; }
}
function parseSocials(text) {
  try { const o = JSON.parse(text); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch { return {}; }
}

function sanitize(m) {
  if (!m) return m;
  const { pin_hash, ...rest } = m;
  return { ...rest, specialties: parseSpec(m.specialties), vendor_categories: parseSpec(m.vendor_categories), vendor_services: parseSpec(m.vendor_services), coverage_zones: parseSpec(m.coverage_zones), side_hustles: parseSpec(m.side_hustles), socials: parseSocials(m.socials), is_founder: !!m.is_founder, is_business: !!m.is_business, hide_phone: !!m.hide_phone, verified: !!m.verified };
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

// Vendor Storefront free-text (what they sell) — trimmed + length-capped.
function stockVal(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s.slice(0, STOCK_MAX);
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
