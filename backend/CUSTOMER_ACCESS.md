# Private client access — staging only

This branch contains an additive PostgreSQL migration and password helper. **It does not enable customer login or change the running server.**

## Before activation
1. Back up and inspect the actual PostgreSQL schema on Vultr; verify public.vehicles(id) and migration compatibility.
2. Use a migration-specific DB role; do not grant schema modification to the API account.
3. Create the initial admin through a secure provisioning process, not a committed password.
4. Implement login with throttling, generic error messages, session expiry, HttpOnly Secure SameSite cookies, CSRF defenses where applicable, and HTTPS.
5. Derive account identity from validated server sessions; never trust a client-provided account ID.
6. Filter every vehicle, location and history query by the authenticated account's vehicle assignments. Check authorization server-side for every request.
7. Test cross-account isolation, disabled accounts, session revocation, invalid credentials and rate limits before production.
8. Do not expose APP_API_KEY in public HTML, JavaScript or Android.
9. The current backend/server.js remains a trusted server-side API-key prototype; customer login is NOT live.
