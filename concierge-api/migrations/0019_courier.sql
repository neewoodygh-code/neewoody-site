-- Courier member type + the delivery side-hustle opt-in.
-- member_type is TEXT (no schema change needed to add 'courier' to the vocab).
-- coverage_zones: JSON array of zones a courier/runner covers (roams multiple
--   zones, unlike the single home `area`); drives buy-for-me ping targeting.
-- side_hustles: JSON array; 'deliveries_errands' opts any carpenter/vendor into
--   buy-for-me pings without being a full courier.
ALTER TABLE members ADD COLUMN coverage_zones TEXT;
ALTER TABLE members ADD COLUMN side_hustles TEXT;
