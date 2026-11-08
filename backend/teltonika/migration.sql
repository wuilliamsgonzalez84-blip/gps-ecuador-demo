-- Apply to the existing gpsecuador database after reviewing schema.
-- Deduplication protects against Teltonika retransmissions.
CREATE UNIQUE INDEX IF NOT EXISTS positions_vehicle_recorded_coordinates_uq
ON positions (vehicle_id, recorded_at, latitude, longitude);
CREATE INDEX IF NOT EXISTS devices_vehicle_enabled_idx
ON devices (vehicle_id) WHERE enabled = true;
