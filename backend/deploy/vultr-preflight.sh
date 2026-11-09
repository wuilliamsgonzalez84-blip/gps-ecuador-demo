#!/usr/bin/env bash
# Read-only preflight for the existing Vultr GPS Ecuador host.
# Does not restart containers, run migrations, print secrets or change firewall rules.
set -euo pipefail
cd /opt/gps-ecuador-staging/backend
echo '== GPS Ecuador: Vultr deployment preflight (read-only) =='
for bin in docker node git curl; do command -v "$bin" >/dev/null || { echo "MISSING: $bin"; exit 1; }; done
echo "Node: $(node --version)"
echo 'Containers (names and status only):'
docker ps --format '{{.Names}} | {{.Status}}'
for name in gps-api gps-postgres; do
 if docker inspect "$name" >/dev/null 2>&1; then
   docker inspect "$name" --format '{{.Name}} | {{.State.Status}} | network={{.HostConfig.NetworkMode}}'
 fi
done
echo 'Existing API endpoint status:'
for endpoint in /api/health /api/vehicles/count; do
 code="$(curl -sS --max-time 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:8080$endpoint" || true)"
 echo "$endpoint HTTP ${code:-unreachable}"
done
echo 'Database tables (table names only):'
docker exec gps-postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname=\x27public\x27 AND tablename IN (\x27vehicles\x27,\x27positions\x27,\x27gps_accounts\x27,\x27gps_account_vehicles\x27,\x27gps_sessions\x27) ORDER BY tablename"' || echo 'Database inspection unavailable; verify postgres container name.'
echo '== No changes applied =='
