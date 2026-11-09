BEGIN;
CREATE TABLE IF NOT EXISTS public.gps_sessions (
 token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
 account_id bigint NOT NULL REFERENCES public.gps_accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gps_sessions_account_idx ON public.gps_sessions(account_id);
CREATE INDEX IF NOT EXISTS gps_sessions_expiry_idx ON public.gps_sessions(expires_at);
COMMIT;
-- Run after 001_customer_access.sql. A dedicated API DB role needs
-- SELECT on gps_accounts and gps_account_vehicles;
-- SELECT/INSERT/DELETE on gps_sessions. Provisioning accounts requires separate privileges.
