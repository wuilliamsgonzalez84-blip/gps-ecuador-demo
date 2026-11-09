#!/usr/bin/env bash
# GPS Ecuador: read-only checks against the existing Vultr deployment.
set -euo pipefail
echo '== GPS Ecuador private API readiness =='
docker ps --format '{{.Names}} | {{.Status}}'
echo 'Existing API process and internal health:'
docker exec gps-api node -e '
const fs=require("node:fs");
const env=process.env;
const port=Number(env.PORT||8080);
console.log("Configured port:",port);
console.log("DB variables present:",["PGHOST","PGDATABASE","PGUSER","PGPASSWORD"].map(k=>k+":"+Boolean(env[k])).join(" "));
fetch("http://127.0.0.1:"+port+"/api/health",{signal:AbortSignal.timeout(3000)})
 .then(r=>console.log("Internal /api/health HTTP",r.status))
 .catch(e=>{console.log("Internal /api/health unavailable:",e.cause?.code||e.message);process.exitCode=1});
'
echo 'Database tables (names only):'
docker exec gps-postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT tablename FROM pg_tables WHERE schemaname = '\''public'\'' AND tablename IN ('\''vehicles'\'','\''positions'\'','\''gps_accounts'\'','\''gps_account_vehicles'\'','\''gps_sessions'\'') ORDER BY tablename"'
echo 'Docker network mode:'
docker inspect gps-api --format '{{.HostConfig.NetworkMode}}'
echo '== Read-only checks finished =='
