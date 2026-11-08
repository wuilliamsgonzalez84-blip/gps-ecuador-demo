-- Independent GPS Ecuador ingestion schema (PostgreSQL 16+).
-- Run on a dedicated database. Device credentials and coordinates are sensitive.
CREATE TABLE IF NOT EXISTS gps_devices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  imei VARCHAR(15) NOT NULL UNIQUE CHECK (imei ~ '^[0-9]{15}$'),
  organization_id BIGINT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Vehículo',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gps_positions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id BIGINT NOT NULL REFERENCES gps_devices(id) ON DELETE CASCADE,
  fix_time TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  speed_kmh DOUBLE PRECISION CHECK(speed_kmh >= 0),
  heading SMALLINT CHECK(heading BETWEEN 0 AND 360),
  altitude SMALLINT,
  satellites SMALLINT CHECK(satellites BETWEEN 0 AND 255),
  priority SMALLINT,
  event_id INTEGER,
  UNIQUE(device_id,fix_time,latitude,longitude)
);
CREATE INDEX IF NOT EXISTS gps_positions_device_time_idx ON gps_positions(device_id,fix_time DESC);
CREATE INDEX IF NOT EXISTS gps_devices_org_idx ON gps_devices(organization_id);
-- Keep ingestion credentials restricted. Do not grant public API roles access to this schema.
