# Vultr GPS Ecuador — staged private API rollout

Verified from the owner's noVNC screenshots (2026-11-09):
- Host directory: `/opt/gps-ecuador-staging/backend`
- Running containers: `gps-api`, `gps-postgres`
- PostgreSQL tables: `public.vehicles`, `public.positions`, `public.gps_accounts`, `public.gps_account_vehicles`, `public.gps_sessions`
- Existing Node API in `gps-api` serves `/api/health` and `/api/vehicles/count`. The new private API source is **not** running there yet.
- PostgreSQL runs in Docker, so `PGHOST=127.0.0.1` inside a separate API container is generally **wrong**. Inspect the actual Docker network and use `gps-postgres` as PGHOST only if DNS resolves within the shared network.

## Safe release plan (do not replace live API blindly)
1. Run `bash backend/deploy/vultr-preflight.sh` from the repo root on the host (or `bash deploy/vultr-preflight.sh` from its backend folder). This script is read-only and does not print passwords.
2. Confirm a recent PostgreSQL backup is present and restorable. The owner already created `/root/gps-ecuador-backup.dump`; verify it still exists and is valid before modifying data.
3. Do not rerun migration 001 or 002 without checking schema and ownership: the screenshots already show the three private-account tables. Migrations have been run against the live DB.
4. Provision a **dedicated API DB role**, not the postgres superuser. It needs SELECT on `vehicles`, `positions`, `gps_accounts`, `gps_account_vehicles`; SELECT, INSERT and DELETE on `gps_sessions`. Provisioning accounts is a separate administrator-only operation. Keep credentials in a server-only env file with permissions 0600, never in GitHub.
5. Start the private API in a separate staging container or process on a loopback-only port, e.g. 18080, with Node 22+, dependencies installed, and the correct Docker network/PGHOST. Required env vars are in `backend/.env.example`: `APP_API_KEY`, `ALLOWED_ORIGIN`, `DEVICE_ALLOWLIST`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PORT`. Do not reuse the public-facing API port or replace `gps-api` yet.
6. Test staging endpoints `/health`, `/api/health`, `/api/vehicles/count`, `/api/me`, `/api/vehicles`, `/api/positions`. The private endpoints must reject unauthenticated requests (401). Check the DB session permissions using a test account and browser origin over HTTPS; do not share passwords in chat.
7. Only after successful end-to-end checks, configure TLS reverse proxy for the private API, with a same-origin frontend and Secure/HttpOnly cookies. The private Node server binds `127.0.0.1`, so an external Docker proxy cannot reach it without an explicit network design. Ensure the app and reverse proxy can communicate safely.
8. Keep `gps-api` and the Teltonika receiver running during staging. Switch traffic only after checks pass, then retain a documented rollback to the old container/image and configuration.

## Known compatibility considerations
- `/api/health` and `/api/vehicles/count` are maintained for the existing service; `/health` also remains available.
- The count endpoint exposes an aggregate vehicle count, not locations; review whether to protect it before public release.
- `backend/server.js` binds to localhost and does not automatically deploy from GitHub.
- The screenshots showed the existing API container using a CommonJS Express app and the new code uses ES modules. Deploy them separately; do not overwrite `/app/server.js` in the existing container.
- Do not publish private account endpoints until the origin, TLS, database privileges and authentication have been checked on Vultr.
