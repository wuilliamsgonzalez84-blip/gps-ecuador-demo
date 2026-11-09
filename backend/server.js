import http from 'node:http';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
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
// Customer credentials are configured only on the server, never in Android.
const customerEmail = (process.env.CUSTOMER_EMAIL || '').trim().toLowerCase();
const customerSalt = process.env.CUSTOMER_PASSWORD_SALT || '';
const customerHash = process.env.CUSTOMER_PASSWORD_HASH || '';
const customerIds = new Set((process.env.CUSTOMER_VEHICLE_IDS || '').split(',').filter(Boolean).map(Number));
const customerEnabled = !!(customerEmail && /^[a-f0-9]{32,}$/i.test(customerSalt) && /^[a-f0-9]{64}$/i.test(customerHash) && customerIds.size &&
  [...customerIds].every(id => Number.isSafeInteger(id) && id > 0 && allowedIds.has(id)));
const sessions = new Map();
const attempts = new Map();
const SESSION_MS = 60 * 60 * 1000;
const MAX_BODY = 4096;
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > MAX_BODY) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function sessionIds(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expires <= Date.now()) { sessions.delete(token); return null; }
  return customerIds;
}
async function customerRoute(req, res, path) {
  if (!customerEnabled) return json(res,503,{error:'Customer login not configured'});
  if (path === '/api/customer/login' && req.method === 'POST') {
    const key = String(req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const entry = attempts.get(key) || { count: 0, until: now + 900000 };
    if (entry.until <= now) { entry.count = 0; entry.until = now + 900000; }
    if (entry.count >= 5) return json(res,429,{error:'Too many attempts'});
    let body;
    try { body = await readBody(req); } catch { return json(res,400,{error:'Invalid request'}); }
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length > 1024) return json(res,400,{error:'Invalid request'});
    const derived = pbkdf2Sync(password, Buffer.from(customerSalt,'hex'), 210000, 32, 'sha256');
    const valid = timingSafeEqual(derived, Buffer.from(customerHash,'hex')) && email === customerEmail;
    if (!valid) {
      entry.count++;
      attempts.set(key,entry);
      return json(res,401,{error:'Invalid credentials'});
    }
    attempts.delete(key);
    const token = randomBytes(32).toString('hex');
    sessions.set(token,{expires:now+SESSION_MS});
    return json(res,200,{token,expiresIn:3600});
  }
  const ids = sessionIds(req);
  if (!ids) return json(res,401,{error:'Unauthorized'});
  if (path === '/api/customer/logout' && req.method === 'POST') {
    sessions.delete(req.headers.authorization.slice(7));
    return json(res,200,{ok:true});
  }
  if (req.method !== 'GET') return json(res,405,{error:'Method not allowed'});
  if (path === '/api/customer/vehicles') return sendVehicles(res,ids);
  if (path === '/api/customer/positions') return sendPositions(res,ids);
  return json(res,404,{error:'Not found'});
}
async function sendVehicles(res,ids) {
  try {
    const result = await pool.query(
      `SELECT v.id, latest.recorded_at FROM public.vehicles v
       LEFT JOIN LATERAL (SELECT recorded_at FROM public.positions p WHERE p.vehicle_id = v.id ORDER BY recorded_at DESC LIMIT 1) latest ON TRUE
       WHERE v.id = ANY($1::bigint[]) ORDER BY v.id`, [[...ids]]);
    return json(res,200,{vehicles:filterAllowedVehicles(result.rows.map(r=>({
      id:Number(r.id),name:'Vehículo '+r.id,status:'unknown',
      lastUpdate:r.recorded_at ? new Date(r.recorded_at).toISOString():null
    })),ids)});
  } catch(err) { console.error('Database query failed:',err.message); return json(res,503,{error:'Database unavailable'}); }
}
async function sendPositions(res,ids) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (vehicle_id) vehicle_id, latitude, longitude, recorded_at FROM public.positions
       WHERE vehicle_id = ANY($1::bigint[]) ORDER BY vehicle_id, recorded_at DESC`, [[...ids]]);
    return json(res,200,{positions:filterAllowedPositions(result.rows.map(r=>({
      deviceId:Number(r.vehicle_id),latitude:Number(r.latitude),longitude:Number(r.longitude),
      fixTime:new Date(r.recorded_at).toISOString(),speed:null,valid:true
    })),ids)});
  } catch(err) { console.error('Database query failed:',err.message); return json(res,503,{error:'Database unavailable'}); }
}
const json = (res, status, data) => {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req,res) => {
  if (req.url === '/health' && req.method === 'GET') return json(res,200,{status:'ok'});
  let path;
  try { path = new URL(req.url,'http://localhost'); } catch { return json(res,400,{error:'Bad URL'}); }
  if (!path.pathname.startsWith('/api/')) return json(res,404,{error:'Not found'});
  if (req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) return json(res,403,{error:'Origin not allowed'});
  if (path.search) return json(res,404,{error:'Not found'});
  if (path.pathname.startsWith('/api/customer/')) return customerRoute(req,res,path.pathname);
  if (req.method !== 'GET') return json(res,405,{error:'Method not allowed'});
  if (req.headers.authorization !== 'Bearer ' + APP_API_KEY) return json(res,401,{error:'Unauthorized'});
  if (path.pathname === '/api/vehicles') return sendVehicles(res,allowedIds);
  if (path.pathname === '/api/positions') return sendPositions(res,allowedIds);
  return json(res,404,{error:'Not found'});
});
server.requestTimeout = 10000;
server.listen(PORT,'127.0.0.1',()=>console.log('GPS Ecuador API listening on localhost:'+PORT));
