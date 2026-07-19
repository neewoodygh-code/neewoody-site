-- Paystack payment intents: an initialized-but-unconfirmed transaction. The
-- signed webhook (charge.success) flips it to paid and writes the real row into
-- the existing `payments` table (member+period, momo_ref = Paystack reference),
-- so all the admin "who paid" views keep working and manual payers grandfather.
-- The Paystack SECRET key lives only as a Worker secret (owner-provisioned).
CREATE TABLE payment_intents (
  reference TEXT PRIMARY KEY,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  period TEXT NOT NULL,                   -- YYYY-MM this payment is for
  amount_ghs INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'monthly',   -- 'monthly' | 'founder'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'failed'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX idx_pi_member ON payment_intents(member_phone, status);
