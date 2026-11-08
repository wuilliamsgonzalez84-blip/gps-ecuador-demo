-- GPS Ecuador: PostgreSQL schema proposal. Review migrations and RLS before deployment.
CREATE TABLE organizations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE app_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  auth_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','viewer')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE vehicles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  traccar_device_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (organization_id,id)
);
CREATE TABLE user_vehicle_access (
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id,vehicle_id)
);
CREATE TABLE alert_rules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('speeding','offline','geofence')),
  threshold NUMERIC,
  enabled BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE alert_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  UNIQUE(vehicle_id,type,occurred_at)
);
CREATE TABLE subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id),
  provider_customer_id TEXT UNIQUE,
  provider_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id),
  actor_user_id BIGINT REFERENCES app_users(id),
  action TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vehicles_org_idx ON vehicles(organization_id);
CREATE INDEX users_org_idx ON app_users(organization_id);
CREATE INDEX alerts_vehicle_time_idx ON alert_events(vehicle_id,occurred_at DESC);
CREATE INDEX audit_org_time_idx ON audit_events(organization_id,occurred_at DESC);
-- IMPORTANT: RLS and/or strictly scoped service-layer authorization is still required.
-- Do not expose these tables directly to public browser queries.
