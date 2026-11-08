'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST, port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE, user: process.env.PGUSER,
  password: process.env.PGPASSWORD, max: 10
});
const secret = process.env.GPS_API_TOKEN;
if (require.main === module && (!secret || secret.length < 32)) throw new Error('GPS_API_TOKEN must be at least 32 characters');
function authorized(value) {
  if (!secret || !value?.startsWith('Bearer ')) return false;
  const actual = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function handler(req, res) {
  if (req.method !== 'GET') return respond(res, 405, { error: 'Method not allowed' });
  const path = new URL(req.url, 'http://localhost');
  if (path.pathname === '/health') return respond(res, 200, { status: 'ok' });
  if (!authorized(req.headers.authorization)) return respond(res, 401, { error: 'Unauthorized' });
  if (path.search) return respond(res, 400, { error: 'Unexpected query' });
  const match = /^\/api\/vehicles\/(\d+)\/latest$/.exec(path.pathname);
  if (path.pathname === '/api/vehicles') {
    pool.query('SELECT id, name FROM vehicles ORDER BY id LIMIT 200')
      .then(r => respond(res, 200, { vehicles: r.rows }))
      .catch(() => respond(res, 503, { error: 'Database unavailable' }));
  } else if (match && Number.isSafeInteger(Number(match[1]))) {
    pool.query('SELECT vehicle_id,latitude,longitude,recorded_at FROM positions WHERE vehicle_id=$1 ORDER BY recorded_at DESC,id DESC LIMIT 1', [match[1]])
      .then(r => respond(res, 200, { position: r.rows[0] || null }))
      .catch(() => respond(res, 503, { error: 'Database unavailable' }));
  } else respond(res, 404, { error: 'Not found' });
}
if (require.main === module) {
  const port = Number(process.env.GPS_API_PORT || 8081);
  http.createServer(handler).listen(port, '127.0.0.1', () => console.log('GPS private API on localhost:' + port));
}
module.exports = { handler };
