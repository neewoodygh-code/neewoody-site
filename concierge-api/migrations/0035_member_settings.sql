-- Carpentry Concierge — shared workshop settings (2026-11-17)
-- One row per member: the business details every tool prints on its letterhead
-- (Job Pricing, Invoices, Cut Sheet), edited from the settings panel that every
-- tool page opens from its header gear. Pricing rates stay in pricing_configs.
-- JSON: {v:1, business:{bizName, tagline, addr1, addr2, email, phone, whatsapp,
--        instagram, payTitle1..3, payBody1..3, terms}}

CREATE TABLE member_settings (
  member_phone TEXT PRIMARY KEY REFERENCES members(phone),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
