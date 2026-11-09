# GPS Ecuador — PostgreSQL API (independent, no Traccar)

Read-only Node.js 20+ API for the existing Vultr PostgreSQL database. Code in GitHub is not automatically deployed. Do not overwrite the running Teltonika receiver.

## Routes
- GET /health (process health only; not a DB check)
- GET /api/vehicles (allowlisted vehicle IDs, most recent timestamp)
- GET /api/positions (latest position per allowlisted vehicle)

Uses public.vehicles(id) and public.positions(vehicle_id,latitude,longitude,recorded_at), verified on the server. Vehicle names are temporary labels until the real vehicles schema is inspected. No speed or online status is inferred. Routes require server-side bearer APP_API_KEY; do not embed it in the Android application or public site. Requests with an Origin header must match ALLOWED_ORIGIN.

## Before deploying
1. Back up the running API configuration and inspect the existing gps-api container, its network, and its environment. Do not replace it blindly.
2. Run npm install on a deployment copy and set the required variables in a private environment file (see .env.example). PGHOST must be reachable from the API runtime; a Docker service hostname may differ from the host's PGHOST.
3. Grant the API database user SELECT on vehicles and positions only. Set DEVICE_ALLOWLIST to real authorized vehicle IDs.
4. Test on localhost with authorized and unauthorized requests and verify results against PostgreSQL before switching traffic.
5. Deploy behind TLS reverse proxy with authenticated per-user sessions and rate limiting before public access. The API key is for a trusted server-side intermediary, not clients.

This API is not yet connected to the mobile frontend. End-to-end Teltonika packet decoding and storage still need verification. Do not treat the /health endpoint alone as proof of database readiness.
