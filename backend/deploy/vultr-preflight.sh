#!/usr/bin/env bash
# Read-only checks for GPS Ecuador's existing Vultr containers.
set -euo pipefail
cd /opt/gps-ecuador-staging/backend
echo '== GPS Ecuador: read-only preflight =='
for bin in docker node curl; do command -v "$bin" >/dev/null || { echo "MISSING: $bin"; exit 1; }; done
echo "Node: $(node --version)"
echo 'Containers:'
docker ps --format '{{.Names}} | {{.Status}} | {{.Ports}}'
for name in gps-api gps-postgres; do
  if docker inspect "$name" >/dev/null 2>&1; then
    docker inspect "$name" --format '{{.Name}} | status={{.State.Status}} | network={{.HostConfig.NetworkMode}} | ports={{json .NetworkSettings.Ports}}'
  fi
done
echo 'API health inside the existing container:'
docker exec gps-api node -e 'const http=require("http");const port=Number(process.env.PORT||3000);for(const path of ["/api/health","/api/vehicles/count"]){http.get({host:"127.0.0.1",port,path,timeout:3000},r=>{console.log(path,"HTTP",r.statusCode);r.resume()}).on("error",e=>console.log(path,e.code||"unreachable"))}' || echo 'Internal API check unavailable'
echo 'Database table names:'
docker exec gps-postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT tablename FROM pg_tables WHERE schemaname = current_schema() ORDER BY tablename"' || echo 'DB table listing unavailable'
echo '== Finished without changes =='
