# Teltonika FMC920 — GPS Ecuador (staging)

This module is a separate receiver, not a replacement for the active server.
Node 20+, PostgreSQL and the existing `vehicles`, `devices`, `positions` tables are required.

## Completed in code
- Codec 8 and Codec 8 Extended AVL parsing, CRC check and IMEI handshake
- TCP buffering for split/coalesced packets
- Rejects unregistered/disabled devices
- Transactional PostgreSQL position inserts and post-commit acknowledgements
- Private localhost API: `GET /health`, `GET /api/vehicles`, `GET /api/vehicles/:id/latest`
- Unit and TCP tests via GitHub Actions

## Before installation
1. Review and back up the live PostgreSQL database. Review `migration.sql` for duplicates before applying.
2. Provision a **separate** staging instance, preferably port 5028, while the existing 5027 receiver remains running.
3. Configure `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` in the service environment. Never commit credentials.
4. Run `npm install --no-save pg` in this folder and `node --test *.test.js`.
5. Run `node app.js` in staging; run `GPS_API_TOKEN=<long-random-secret> node api.js` separately.
6. Register the physical device IMEI in `devices` linked to a vehicle before directing the tracker to the staging receiver.
7. Verify real Codec 8/8E data, network access, PostgreSQL persistence and ACK behavior before moving traffic from 5027.

## Security and scope
- Never expose port 8081 or `GPS_API_TOKEN` in a public website/mobile application.
- The public GitHub Pages demo is **not** connected to this API. It needs proper user login, per-vehicle authorization and HTTPS before real positions can be displayed.
- This is not yet a production-grade commercial fleet service. Add rate limiting, monitoring, migrations, backups, audit logging and tenant separation.
- No Traccar dependency in these new modules.
