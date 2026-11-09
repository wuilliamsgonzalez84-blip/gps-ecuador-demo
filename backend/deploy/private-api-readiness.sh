#!/usr/bin/env bash
# GPS Ecuador: non-destructive readiness check before staging private API.
set -euo pipefail
echo '== GPS Ecuador private API readiness (read only) =='
docker ps --format '{{.Names}} | {{.Status}}'
echo 'Existing API:'
docker exec gps-api node -e 'fetch("http://127.0.0.1:8080/api/health",{signal:AbortSignal.timeout(3000)}).then(r=>console.log("health HTTP",r.status)).catch(e=>{console.log("health error",e.cause?.code||e.message);process.exitCode=1})'
echo 'Database schema:'
docker exec gps-postgres psql -X -U gpsadmin -d gpsecuador -Atc "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('vehicles','positions','gps_accounts','gps_account_vehicles','gps_sessions') ORDER BY tablename"
echo 'Docker network:'
docker inspect gps-api --format '{{.HostConfig.NetworkMode}}'
echo 'Staging folder:'
test -d /opt/gps-ecuador-staging/backend && echo 'present' || echo 'missing'
echo 'NOTE: No containers, ports, accounts, or permissions were changed.'
