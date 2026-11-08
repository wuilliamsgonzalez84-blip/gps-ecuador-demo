import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const port = Number(process.env.API_PORT || 8090);
const host = process.env.API_HOST || '127.0.0.1';
const apiKey = process.env.GPS_API_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';
const allowedOrigin = process.env.API_ALLOWED_ORIGIN || '';
const pool = new Pool(databaseUrl ? { connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 5000 } : {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 5,
  connectionTimeoutMillis: 5000
});

function authorized(value) {
  const provided = typeof value === 'string' && value.startsWith('Bearer ') ? value.slice(7) : '';
  const a = Buffer.from(provided);
  const b = Buffer.from(apiKey);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
function respond(res, code, body, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigin && origin === allowedOrigin) headers['Access-Control-Allow-Origin'] = origin;
  res.writeHead(code, headers);
  res.end(JSON.stringify(body));
}
function validId(id) { return /^\d{1,15}$/.test(id) && BigInt(id) > 0n; }
function buildServer(db = pool) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    if (origin && origin !== allowedOrigin) return respond(res, 403, { error: 'Origin not allowed' });
    if (req.method !== 'GET') return respond(res, 405, { error: 'Method not allowed' }, origin);
    if (req.url === '/health') return respond(res, 200, { status: 'ok' }, origin);
    if (!authorized(req.headers.authorization)) return respond(res, 401, { error: 'Unauthorized' }, origin);
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.search && url.pathname !== '/api/positions') return respond(res, 404, { error: 'Not found' }, origin);
    try {
      if (url.pathname === '/api/vehicles') {
        // Only devices explicitly enabled and assigned to a vehicle are returned.
        const result = await db.query(
          'SELECT DISTINCT vehicle_id::text AS id FROM devices WHERE enabled = true AND vehicle_id IS NOT NULL ORDER BY id LIMIT 100'
        );
        return respond(res, 200, { vehicles: result.rows }, origin);
      }
      if (url.pathname === '/api/positions') {
        const vehicleId = url.searchParams.get('vehicle_id');
        if (!vehicleId || !validId(vehicleId) || [...url.searchParams.keys()].some(k => k !== 'vehicle_id')) {
          return respond(res, 400, { error: 'Valid vehicle_id required' }, origin);
        }
        const allowed = await db.query(
          'SELECT 1 FROM devices WHERE vehicle_id = $1 AND enabled = true LIMIT 1',
          [vehicleId]
        );
        if (!allowed.rowCount) return respond(res, 404, { error: 'Vehicle not found' }, origin);
        const result = await db.query(
          'SELECT latitude, longitude, recorded_at FROM positions WHERE vehicle_id = $1 ORDER BY recorded_at DESC LIMIT 200',
          [vehicleId]
        );
        return respond(res, 200, { vehicleId, positions: result.rows }, origin);
      }
      return respond(res, 404, { error: 'Not found' }, origin);
    } catch (err) {
      console.error('Database query failed:', err.code || err.name || 'unknown');
      return respond(res, 503, { error: 'Database unavailable or schema incompatible' }, origin);
    }
  });
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  if (apiKey.length < 32) {
    console.error('GPS_API_KEY must contain at least 32 characters');
    process.exit(1);
  }
  const server = buildServer();
  server.requestTimeout = 10000;
  server.listen(port, host, () => console.log('GPS Ecuador read-only API listening on ' + host + ':' + port));
}
export { buildServer };
