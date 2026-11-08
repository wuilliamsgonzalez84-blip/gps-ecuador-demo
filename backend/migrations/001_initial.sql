-- Idempotent schema bootstrap for a NEW database.
-- Review against the existing Vultr schema before applying; do not run blindly.
BEGIN;
CREATE TABLE IF NOT EXISTS vehicles (
 id BIGSERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 imei VARCHAR(20) UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS positions (
 id BIGSERIAL PRIMARY KEY,
 vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
 latitude DOUBLE PRECISION NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude DOUBLE PRECISION NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_positions_vehicle_time ON positions(vehicle_id,recorded_at DESC);
CREATE TABLE IF NOT EXISTS devices (
 id BIGSERIAL PRIMARY KEY,
 imei VARCHAR(15) NOT NULL UNIQUE CHECK(imei ~ '^[0-9]{15}$'),
 vehicle_id BIGINT REFERENCES vehicles(id),
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
