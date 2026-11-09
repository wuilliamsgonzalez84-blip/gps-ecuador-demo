import http from 'node:http';
import pg from 'pg';
import { filterAllowedVehicles, filterAllowedPositions } from './lib/vehicle-utils.js';

const PORT = Number(process.env.PORT || 8080);
const APP_API_KEY = process.env.APP_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const DEVICE_ALLOWLIST = (process.env.DEVICE_ALLOWLIST || '').split(',').map(x => x.trim()).filter(Boolean);
const requiredDb = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
if (!APP_API_KEY || !ALLOWED_ORIGIN || !DEVICE_ALLOWLIST.length || requiredDb.some(k => !process.env[k])) {
  console.error('Missing required environment variables. See .env.example');
  process.exit(1);
}
const allowedIds = new Set(DEVICE_ALLOWLIST.map(Number));
if ([...allowedIds].some(id => !Number.isSafeInteger(id) || id <= 0)) throw Error('Invalid vehicle allowlist');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw Error('Invalid port');
const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  statement_timeout: 5000
});
pool.on('error', err => console.error('PostgreSQL idle connection error:', err.message));
const json = (res, status, data) => {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req,res) => {
  if (req.url === '/health' && req.method === 'GET') return json(res,200,{status:'ok'});
  if (!req.url?.startsWith('/api/')) return json(res,404,{error:'Not found'});
  if (req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) return json(res,403,{error:'Origin not allowed'});
  if (req.method !== 'GET') return json(res,405,{error:'Method not allowed'});
  if (req.headers.authorization !== 'Bearer ' + APP_API_KEY) return json(res,401,{error:'Unauthorized'});
  const path = new URL(req.url,'http://localhost');
  if (!['/api/vehicles','/api/positions'].includes(path.pathname) || path.search) return json(res,404,{error:'Not found'});
  try {
    const ids = [...allowedIds];
    if (path.pathname === '/api/vehicles') {
      const result = await pool.query(
        `SELECT v.id, latest.recorded_at
           FROM public.vehicles v
           LEFT JOIN LATERAL (
             SELECT recorded_at FROM public.positions p
             WHERE p.vehicle_id = v.id ORDER BY recorded_at DESC LIMIT 1
           ) latest ON TRUE
          WHERE v.id = ANY($1::bigint[]) ORDER BY v.id`,
        [ids]
      );
      const vehicles = result.rows.map(r => ({
        id: Number(r.id),
        name: 'Vehículo ' + r.id,
        status: 'unknown',
        lastUpdate: r.recorded_at ? new Date(r.recorded_at).toISOString() : null
      }));
      return json(res,200,{vehicles:filterAllowedVehicles(vehicles,allowedIds)});
    }
    const result = await pool.query(
      `SELECT DISTINCT ON (vehicle_id) vehicle_id, latitude, longitude, recorded_at
         FROM public.positions
        WHERE vehicle_id = ANY($1::bigint[])
        ORDER BY vehicle_id, recorded_at DESC LIMIT 1`,
      [ids]
    );
    const positions = result.rows.map(r => ({
      deviceId: Number(r.vehicle_id),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      fixTime: new Date(r.recorded_at).toISOString(),
      speed: null,
      valid: true
    }));
    return json(res,200,{positions:filterAllowedPositions(positions,allowedIds)});
  } catch (err) {
    console.error('Database query failed:', err.message);
    return json(res,503,{error:'Database unavailable'});
  }
});
server.requestTimeout = 10000;
server.listen(PORT,'127.0.0.1',()=>console.log('GPS Ecuador API listening on localhost:'+PORT));
