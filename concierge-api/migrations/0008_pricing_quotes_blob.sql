-- The member pricing tool (carpenter-pricing.html) saves its quotes as one
-- bulk array, so store them as a single JSON blob per member alongside the
-- config, rather than the granular pricing_quotes table from 0007 (which is
-- left unused). Keeps the frontend integration a thin swap.
ALTER TABLE pricing_configs ADD COLUMN quotes TEXT;
