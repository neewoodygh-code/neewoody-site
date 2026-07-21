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
- [ ] **15–20 paying members** (also your pre-set trigger to switch on safety check-in)
- [ ] A handful of **real** job + buy-for-me posts (members, not seeded)
- [ ] **≥ 1 documented real outcome** (someone got work / hired via the platform)
- [ ] Most profiles complete (photo + trades/services + area)

**Unlocks:** safety check-in for members · light word-of-mouth acquisition
**Hold until passed:** ad spend · new regions · any new feature

## Gate 2 — MVP validated · *does it retain & monetise repeatably, hands-off?*
**Pass when ALL:**
- [ ] **≥ 50–60% monthly renewal** (active founders count); churn low
- [ ] A stable core of **weekly-active** members
- [ ] **Non-founder GHS 50/mo payers who renew** (willingness-to-pay beyond the founder discount)
- [ ] Connection events **trending up** over 4–6 weeks
- [ ] Support handleable by one person; moderation load manageable

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

## Kill / pivot triggers
- **Gate 1 miss** in ~60–90 days (no paying floor OR zero real connections) → the gap is **channel or value prop**, not features. Fix that; don't scale.
- **High churn despite activity** at Gate 2 → value isn't sticking. Retention before spend.
- **Members + posts but no connections** → discovery/matching is the gap, not member count.

## Parking lot (post-gate ideas — do NOT build yet)
Native app / TWA (push + background GPS) · automatic SMS safety alerts (Hubtel/Africa's Talking) ·
live "near me" courier dispatch · fair-fee suggestion engine · Paystack auto-renew subscriptions ·
Academy content · engagement signals on the dashboard · storefront/directory logo reuse ·
public buy-for-me · richer analytics.
