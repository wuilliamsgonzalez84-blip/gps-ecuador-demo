BEGIN;
CREATE TABLE IF NOT EXISTS customer_accounts (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customer_vehicle_access (
 customer_id BIGINT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
 vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
 PRIMARY KEY(customer_id,vehicle_id)
);
CREATE TABLE IF NOT EXISTS customer_sessions (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 customer_id BIGINT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
 token_hash CHAR(64) NOT NULL UNIQUE,
 expires_at TIMESTAMPTZ NOT NULL,
 revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_sessions_customer_id_idx ON customer_sessions(customer_id);
COMMIT;
