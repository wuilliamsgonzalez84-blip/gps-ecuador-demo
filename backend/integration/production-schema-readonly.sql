-- GPS Ecuador — read-only production compatibility inspection.
-- Run with the existing PostgreSQL read-only account; no schema changes.
SELECT current_database() AS database_name, current_user AS database_role,
       current_setting('server_version') AS postgres_version;
SELECT n.nspname AS schema_name, c.relname AS table_name,
       a.attname AS column_name, pg_catalog.format_type(a.atttypid,a.atttypmod) AS data_type,
       a.attnotnull AS required
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
WHERE n.nspname='public'
  AND c.relname IN ('vehicles','positions','gps_accounts','gps_account_vehicles','gps_sessions')
  AND c.relkind IN ('r','p')
  AND a.attnum>0 AND NOT a.attisdropped
ORDER BY c.relname,a.attnum;
SELECT to_regclass('public.vehicles') IS NOT NULL AS has_vehicles,
       to_regclass('public.positions') IS NOT NULL AS has_positions,
       to_regclass('public.gps_accounts') IS NOT NULL AS has_accounts,
       to_regclass('public.gps_account_vehicles') IS NOT NULL AS has_account_assignments,
       to_regclass('public.gps_sessions') IS NOT NULL AS has_sessions;
SELECT table_name,privilege_type
FROM information_schema.role_table_grants
WHERE grantee=current_user AND table_schema='public'
  AND table_name IN ('vehicles','positions','gps_accounts','gps_account_vehicles','gps_sessions')
ORDER BY table_name,privilege_type;
-- Expected API fields:
-- vehicles.id numeric/bigint-compatible primary key
-- positions.vehicle_id, latitude, longitude, recorded_at (timestamp with time zone)
-- gps_accounts.id, email, password_hash, role, active
-- gps_account_vehicles.account_id, vehicle_id
-- gps_sessions.token_hash, account_id, expires_at
-- API runtime role must SELECT from all five tables and INSERT/DELETE gps_sessions.
