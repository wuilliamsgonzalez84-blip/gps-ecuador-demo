-- GPS Ecuador: optional NEW features; REVIEW against actual VPS schema first.
-- Never run this migration blindly on the production database.
BEGIN;
CREATE TABLE IF NOT EXISTS organizations (
 id BIGSERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS organization_users (
 id BIGSERIAL PRIMARY KEY,
 organization_id BIGINT NOT NULL REFERENCES organizations(id),
 email TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('owner','admin','viewer')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(organization_id,email)
);
-- New installations only: association is nullable for migration compatibility.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON vehicles(organization_id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_battery_percent SMALLINT CHECK(last_battery_percent BETWEEN 0 AND 100);
-- The deduplication key is exact vehicle+timestamp+coordinates, so stationary
-- samples with a different timestamp are still retained.
-- Existing duplicate rows must be inspected and cleaned BEFORE enabling this index.
-- DO NOT add a unique index here: it could fail or lock a populated table.
COMMIT;

-- Separate maintenance step, only after reviewing existing duplicates:
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
-- idx_positions_dedup ON positions(vehicle_id,recorded_at,latitude,longitude);
-- Requires PostgreSQL version/index and query plan review.
