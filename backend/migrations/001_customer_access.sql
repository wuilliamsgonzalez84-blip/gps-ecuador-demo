-- GPS Ecuador: private customer accounts (staging migration; do not run blindly)
BEGIN;
CREATE TABLE IF NOT EXISTS public.gps_accounts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','client')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT email_normalized CHECK (email = lower(btrim(email))),
 CONSTRAINT password_hash_scrypt CHECK (password_hash LIKE 'scrypt$%')
);
CREATE TABLE IF NOT EXISTS public.gps_account_vehicles (
 account_id bigint NOT NULL REFERENCES public.gps_accounts(id) ON DELETE CASCADE,
 vehicle_id bigint NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
 PRIMARY KEY(account_id,vehicle_id)
);
CREATE INDEX IF NOT EXISTS gps_account_vehicles_vehicle_idx ON public.gps_account_vehicles(vehicle_id);
COMMIT;
-- Apply using a dedicated migration role, not the read-only API user.
-- No account or password is inserted automatically.
