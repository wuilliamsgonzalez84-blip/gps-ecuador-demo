#!/usr/bin/env bash
# Safe PostgreSQL storage smoke test for existing GPS Ecuador database.
# Requires running on the Vultr host with the existing gps-postgres container.
set -euo pipefail
docker exec -i gps-postgres sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN;
DO $$
DECLARE
  sample_vehicle bigint;
  sample_id bigint;
  sample_count integer;
BEGIN
  SELECT id INTO sample_vehicle FROM public.vehicles ORDER BY id LIMIT 1;
  IF sample_vehicle IS NULL THEN
    RAISE NOTICE 'SKIP: No registered vehicles; no synthetic vehicle created';
    RETURN;
  END IF;
  INSERT INTO public.positions (vehicle_id,latitude,longitude,recorded_at)
    VALUES (sample_vehicle,-0.123456,-78.123456,now())
    RETURNING id INTO sample_id;
  SELECT count(*) INTO sample_count FROM public.positions
    WHERE id=sample_id AND vehicle_id=sample_vehicle
      AND latitude=-0.123456 AND longitude=-78.123456;
  IF sample_count <> 1 THEN
    RAISE EXCEPTION 'Storage verification failed';
  END IF;
  RAISE NOTICE 'PASS: Position inserted and read back within transaction';
END $$;
ROLLBACK;
SELECT 'PASS: transaction rolled back; no test position retained' AS result;
SQL
