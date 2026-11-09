# GPS Ecuador — independent API prototype

Node.js 20+ read-only API; no Traccar dependency. Not yet production-ready.

## Endpoints
- GET /health (local health check)
- GET /api/vehicles (authorized vehicles in local snapshot)
- GET /api/positions (authorized valid positions in local snapshot)

The API listens on 127.0.0.1 and requires a server-side bearer token for /api routes. It reads a JSON snapshot from GPS_SNAPSHOT_FILE. A separate trusted Teltonika receiver/storage pipeline must produce this file atomically; this repository does not yet connect that pipeline. Example snapshot structure: {"vehicles":[],"positions":[]}. Missing or malformed snapshots return HTTP 503, never invented positions.

## Run
1. Install Node.js 20+.
2. Configure environment variables from .env.example outside the public repository.
3. Create a private snapshot file with the structure above, writable only by the trusted receiver and readable by the API.
4. Run `node backend/server.js` from repository root or `node server.js` from backend.
5. Check `curl http://127.0.0.1:8080/health`.

## Security and next steps
APP_API_KEY is for server-to-server requests, **not** a browser or mobile app. Do not expose it in GitHub Pages. Before production: implement authenticated user sessions, authorization per organization, PostgreSQL storage, receiver ingestion, atomic snapshot updates (or replace snapshots with database queries), TLS reverse proxy, rate limiting, audit logs, and tests. Do not expose raw device identifiers or coordinates publicly. The frontend demo still uses fictitious data.
