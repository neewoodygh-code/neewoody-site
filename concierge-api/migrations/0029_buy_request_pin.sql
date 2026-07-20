-- Optional delivery GPS pin on a buy-for-me request. Lets the poster drop a
-- pin (their delivery location) so runners can see distance-to-drop and a map
-- link. Distance is computed CLIENT-SIDE from the viewer's own geolocation —
-- no live courier tracking, no server-side geo queries (zone pings unchanged).
ALTER TABLE buy_requests ADD COLUMN deliver_lat REAL;
ALTER TABLE buy_requests ADD COLUMN deliver_lng REAL;
