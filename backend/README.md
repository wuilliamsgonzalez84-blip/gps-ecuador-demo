# GPS Ecuador API — private prototype

Node.js 20+ API scaffold. **Not production-ready or multi-tenant.** No live positions or history are exposed yet.

## Features
- Health check: GET /health
- Authenticated GET /api/vehicles: fetches Traccar device metadata, filtered by an explicit server-side allowlist.
- Listens on 127.0.0.1 only; place behind a properly configured HTTPS reverse proxy.
- Does not expose Traccar credentials to the public frontend.

## Run
1. Install Node.js 20+ on a trusted server.
2. Set the variables from `.env.example` securely (do not commit secrets).
3. `node server.js`
4. Test locally: `curl http://127.0.0.1:8080/health`.

**Security limitations:** APP_API_KEY is a server-to-server secret, not a browser login. Never put it in public JavaScript, GitHub Pages, or a mobile app. This starter is not ready to connect the public demo. Add real user authentication, authorization per organization, rate limiting, audit logging, reverse proxy TLS, and tests before exposing it. Configure Traccar with least-privilege access; verify your Traccar version supports bearer tokens.

The demo UI remains separate until a secure authenticated backend is deployed.
