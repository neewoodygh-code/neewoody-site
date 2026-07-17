# concierge-api

Carpentry Concierge membership API — a **separate** Cloudflare Worker, deliberately
isolated from `neewoody-dispatch-api`. A bug here must never touch dispatch or lead capture.

- **Storage:** Cloudflare **D1** (`concierge`) + shared **R2** bucket (`neewoody-media`, `concierge/` prefix)
- **Auth:** phone + 5-digit PIN → stateless HMAC-signed bearer token (30-day expiry)
- **No** email / SMS / self-service registration / self-service PIN reset (Phase 1)

## One-time setup (owner's Cloudflare account)

Run these from **this directory** (`concierge-api/`). Requires `npm i` first (installs wrangler) and `wrangler login`.

```bash
# 1. Create the D1 database, then paste the printed database_id into wrangler.toml
npm run db:create
#    -> copy database_id -> wrangler.toml [[d1_databases]].database_id

# 2. Apply the schema migration to the remote D1
npm run db:migrate

# 3. Set the HMAC session secret (any long random string; keep it safe, never commit)
npm run secret:session
#    paste e.g. the output of:  openssl rand -base64 48

# 4. Deploy
npm run deploy
```

The Worker publishes to `https://concierge-api.<account>.workers.dev`. The frontend
(`js/concierge.js`) is already pointed at `https://concierge-api.neewoodygh.workers.dev/api`
— adjust that one constant if your account subdomain differs.

> The R2 bucket `neewoody-media` already exists (shared with the rest of the site).
> No new bucket is created.

## Bootstrapping the first admin

There is no public registration. Create the owner's admin account directly against D1
(one time), then everything else is done through `/concierge/admin.html`.

Generate a PIN hash locally (Node 18+ has Web Crypto):

```bash
node -e '
const it=100000;const enc=s=>new TextEncoder().encode(s);
const b64=b=>{let s="";for(const x of b)s+=String.fromCharCode(x);return btoa(s);};
(async()=>{
  const pin=process.argv[1];
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const k=await crypto.subtle.importKey("raw",enc(pin),"PBKDF2",false,["deriveBits"]);
  const bits=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:it,hash:"SHA-256"},k,256));
  console.log(b64(salt)+":"+b64(bits));
})();' 12345
```

Then insert the admin (replace phone, name, and the hash from above):

```bash
wrangler d1 execute concierge --remote --command \
"INSERT INTO members (phone,name,specialties,pin_hash,role,status,is_founder,joined_at)
 VALUES ('233244633464','Nuer','[\"furniture\"]','PASTE_HASH_HERE','admin','approved',1,'2026-07-14T00:00:00Z');"
```

Log in at `/concierge/login.html` with that phone + PIN. From then on, add founders
via the admin dashboard.

## Local development

```bash
npm run db:migrate:local   # apply schema to local D1
npm run dev                # wrangler dev, serves on http://localhost:8787
```

For local secret: create a `.dev.vars` file (gitignored) with `SESSION_SECRET=dev-secret`.
CORS already allows `localhost`/`127.0.0.1` on any port.

## Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{phone,pin}` → `{token,member}` (401 / 429; 403 `pending_review`/`account_suspended` if not approved) |
| GET | `/api/me` | member | own record (no pin_hash) |
| PUT | `/api/me` | member | update name, business_name, area, specialties, photo_url |
| GET | `/api/directory` | member | approved members incl. phone (for WhatsApp) |
| POST | `/api/me/photo` | member | raw `image/jpeg` body ≤300KB → R2 `concierge/members/<phone>.jpg`, sets photo_url |
| DELETE | `/api/me/photo` | member | remove own photo (R2 object + photo_url) |
| GET | `/api/media/members/<phone>.jpg` | public | serve member photo (cached 1 day, ETag/304) |
| POST | `/api/public/jobs` | public | client job request from `/hire.html` (lands `pending`; phone-throttled) |
| POST | `/api/public/register` | public | self-service member registration from `/concierge/register.html` (lands `pending`; role/status/is_founder hardcoded) |
| GET | `/api/admin/client-jobs` | admin | list client requests (pending first) |
| PUT | `/api/admin/client-jobs/:id` | admin | approve / reject / mark filled (approve publishes + alerts zone) |
| DELETE | `/api/admin/client-jobs/:id` | admin | remove a client request |
| POST | `/api/me/push` | member | save this device's Web Push subscription (job alerts) |
| DELETE | `/api/me/push` | member | remove a push subscription by `{endpoint}` |
| GET | `/api/jobs` | member | open + filled jobs (approved posters) incl. own posts |
| POST | `/api/jobs` | member | post a job (≤10 open per member; no rate field by design) |
| PUT | `/api/jobs/:id` | poster/admin | set status open/filled |
| DELETE | `/api/jobs/:id` | poster/admin | remove post (admin = moderation) |
| GET | `/api/admin/members` | admin | full list incl. pending |
| POST | `/api/admin/members` | admin | create member (admin supplies PIN) |
| PUT | `/api/admin/members/:phone` | admin | status/role/is_founder, profile, skill level, reset PIN |
| DELETE | `/api/admin/members/:phone` | admin | permanent delete (body must echo `{confirm:<phone>}`; self-delete blocked; removes payments/cutlists/attempts/photo) |
| POST | `/api/admin/members/:phone/photo` | admin | upload a photo on a member's behalf |
| DELETE | `/api/admin/members/:phone/photo` | admin | remove a member's photo |
| POST | `/api/admin/payments` | admin | record MoMo payment (upsert on member+period) |
| GET | `/api/admin/payments?period=YYYY-MM` | admin | who paid this month |

## Files

- `wrangler.toml` — bindings (fill in `database_id` after `db:create`)
- `migrations/0001_initial.sql` — members, payments, login_attempts
- `migrations/0002_saved_cutlists.sql` — saved cutlists
- `migrations/0003_skill_levels.sql` — members.skill_level + years_experience
- `migrations/0004_jobs_and_badges.sql` — members.is_business + availability; jobs table
- `migrations/0005_push_subs.sql` — push_subs (Web Push job alerts)
- `migrations/0006_client_jobs.sql` — client_jobs (public "Hire a Carpenter" requests)

Secrets (set via `wrangler secret put`, never committed): `SESSION_SECRET`, and the Concierge VAPID keypair `VAPID_PUBLIC` / `VAPID_PRIVATE` / `VAPID_X` / `VAPID_Y` (separate from dispatch's keys; the public key is also hardcoded in `js/concierge.js`). Local dev reads them from the gitignored `concierge-api/.dev.vars`.
- `src/index.js` — the whole Worker (router, auth, crypto, handlers)
