-- Offered-services catalog: the curated, admin-moderated vocabulary of side
-- services any member can list ("Services I offer", stored in members.side_hustles
-- as slugs). Members pick from approved entries; "suggest a service" adds a
-- pending row an admin approves. Moderating the VOCABULARY (not each listing) is
-- what keeps the global services view from cluttering. 'deliveries_errands' is
-- the courier-wired entry (see notifyBuyZone).
CREATE TABLE service_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',   -- 'approved' | 'pending'
  suggested_by TEXT,                          -- phone of suggester (NULL for seeds)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO service_catalog (slug, label, status) VALUES
  ('deliveries_errands', 'Deliveries & errands', 'approved'),
  ('3d_modelling',       '3D modelling',          'approved'),
  ('product_design',     'Product & furniture design', 'approved'),
  ('teaching_training',  'Teaching & training',   'approved'),
  ('cad_cutlists',       'CAD & cutlist prep',    'approved'),
  ('site_supervision',   'Site supervision',      'approved'),
  ('consultancy',        'Consultancy',           'approved'),
  ('cnc_machining',      'CNC / machining',       'approved'),
  ('finishing_spraying', 'Finishing & spraying',  'approved'),
  ('photography',        'Photography of work',   'approved');
