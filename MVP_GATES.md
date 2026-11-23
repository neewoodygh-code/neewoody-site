# Carpentry Concierge — Stage Gates

Purpose (owner + developer, 2026-07-21): the product has **far outpaced an MVP**.
This file is the discipline that keeps new ideas from destabilising the core loop
before it's solidified. **Nothing new ships unless it serves the gate we're on.**
New feature idea → park it in "Parking lot" below → build only when its gate unlocks.

## MVP definition (the one loop to prove)
> A **paying member reliably gets discovered and makes a real connection** — day-work,
> a hire, or a material run — **through the platform, without hand-matchmaking**, and
> **comes back / renews.**

## Blocker: we can't currently see outcomes
Job/material money moves on WhatsApp (off-platform), so the platform is blind to
whether anyone got work. **Instrument a success signal before judging any gate:**
- [ ] WhatsApp "Contact" click counters (per job / buy-request / profile)
- [ ] "Did you get hired / hire someone through Concierge?" one-tap on a job/notification
- [ ] Renewal tracking (Paystack already provides this)
- [ ] Monthly one-question survey: "Did Concierge get you work or a hire this month?"

This is the **only** net-new build allowed before Gate 1 passes.

---

## Gate 0 — Foundation · *can it transact?*  ✅ (passed)
- [x] Live; pay-to-join end-to-end (Paystack live + verify reconciled)
- [x] Core surfaces functional (directory, jobs, buy-for-me, safety, tools)
- [x] A real founder payment landed and reconciled

## Gate 1 — Signal of life · *do real people join, pay, and connect?*
**Pass when ALL:**
- [x] **15–20 paying members** (also your pre-set trigger to switch on safety check-in) — **114 approved members on 2026-11-23** (96 founders, 18 regular; plus 56 unpaid sign-ups), from `node scripts/gate-report.mjs`; safety check-in was switched on at 37 paying (2026-07-20). 4 founding places were still open.
- [ ] A handful of **real** job + buy-for-me posts (members, not seeded)
- [ ] **≥ 1 documented real outcome** (someone got work / hired via the platform)
- [x] Most profiles complete (photo + trades/services + area) — owner, 2026-11-23. **Owner's read the same day: jobs, buy-for-me and the other marketplace features remain unused; the generators and Job Pricing get most of the traffic.**

**Unlocks:** safety check-in for members · light word-of-mouth acquisition
**Hold until passed:** ad spend · new regions · any new feature

## Gate 2 — MVP validated · *does it retain & monetise repeatably, hands-off?*
**Pass when ALL:**
- [ ] **≥ 50–60% monthly renewal** (active founders count); churn low
- [ ] A stable core of **weekly-active** members
- [ ] **Non-founder GHS 50/mo payers who renew** (willingness-to-pay beyond the founder discount)
- [ ] Connection events **trending up** over 4–6 weeks
- [ ] Support handleable by one person; moderation load manageable
- [ ] **Carpenter vetting defined and running** (owner 2026-11-23: "one of the gates has to be carpenter vetting"). Anything that sends clients or client money to a carpenter (Hire a Carpenter at scale, project management) waits for it. How to vet is still to decide: see "Carpenter vetting" below.

**Unlocks:** 🎯 **"MVP proven" — you may now scale**
**Hold until passed:** heavy acquisition · native app · SMS safety · live GPS dispatch

## Gate 3 — Scale-ready · *can we pour fuel on it without it breaking?*
**Pass when ALL:**
- [ ] Unit economics hold at **2–3× volume** (infra/member flat, margin clear)
- [ ] A **repeatable funnel** with a known conversion % (TikTok → register → pay)
- [ ] Reliability: no critical bugs; push + dashboard fallback proven; **backups in place** (see `BACKUP_RESTORE.md`)
- [ ] Moderation/trust policy documented (verified badge + reactive removal)
- [ ] Ops not 100% dependent on the owner

**Unlocks:** spend, regions, hire help, build the deferred native app / SMS / near-me

---

## Carpenter vetting (to decide with the owner; nothing built)
Today: pay-to-join (2026-07-20 reversed the old approval gate), so payment, not skill, admits a member; quality is reactive (suspend/remove) plus the admin-granted "Verified by Carpentry Concierge Ghana" mark (`verified`). Vetting would give that mark real criteria. Options to weigh, alone or as levels of one badge:
- **Work evidence:** photos of finished jobs (ideally with in-progress shots), reviewed by Neewoody.
- **References:** a past client or a verified member vouches; Neewoody calls them.
- **Practical check:** a short task or a site/workshop visit (strongest, costs the owner time).
- **Identity:** Ghana Card and, for businesses, the business registration.
- **Track record on the platform:** completed jobs and client feedback, once project management exists (feeds back into the badge).
Questions: who does the vetting (the owner alone does not scale), is it free or a paid add-on, does it expire, and what does a client see (one Verified mark or levels such as ID-checked / work-checked / Neewoody-tested)?

## Kill / pivot triggers
- **Gate 1 miss** in ~60–90 days (no paying floor OR zero real connections) → the gap is **channel or value prop**, not features. Fix that; don't scale.
- **High churn despite activity** at Gate 2 → value isn't sticking. Retention before spend.
- **Members + posts but no connections** → discovery/matching is the gap, not member count.

## Parking lot (post-gate ideas — do NOT build yet)
Native app / TWA (push + background GPS) · automatic SMS safety alerts (Hubtel/Africa's Talking) ·
live "near me" courier dispatch · fair-fee suggestion engine · Paystack auto-renew subscriptions ·
Academy content · engagement signals on the dashboard · storefront/directory logo reuse ·
public buy-for-me · richer analytics ·
**project management for client jobs** (owner idea 2026-11-23: client hires a carpenter through the site, sees a masked design and price, approves and pays through the site for a payment record; protects both sides). **Gated at Gate 2 at the earliest**: it brings clients in as users and touches client money and disputes, so it waits until the member loop is proven. Builds on My files. Detail and open questions: `docs/project-management-plan.md`.
