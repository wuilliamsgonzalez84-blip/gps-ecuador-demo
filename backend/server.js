import http from 'node:http';
import pg from 'pg';
import {randomBytes, createHash} from 'node:crypto';
import {normalizeEmail, verifyPassword} from './lib/customer-auth.js';
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
const SESSION_MS = 12 * 60 * 60 * 1000;
const attempts = new Map();
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const cookie = (name, value, maxAge) => name + '=' + value + '; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge;
function sessionToken(req) {
  const match = /(?:^|;\\s*)gps_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '');
  return match?.[1] || null;
}
async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw Error('Invalid content type');
  let input = '';
  for await (const chunk of req) {
    input += chunk;
    if (input.length > 4096) throw Error('Request too large');
  }
  return JSON.parse(input);
}
async function sessionAccount(req) {
  const token = sessionToken(req);
  if (!token) return null;
  const result = await pool.query(
    `SELECT a.id, a.role FROM public.gps_sessions s
       JOIN public.gps_accounts a ON a.id=s.account_id
      WHERE s.token_hash=$1 AND s.expires_at > now() AND a.active=true`,
    [tokenHash(token)]
  );
  return result.rows[0] || null;
}
const server = http.createServer(async (req,res) => {
  if (req.url === '/health' && req.method === 'GET') return json(res,200,{status:'ok'});
  if (!req.url?.startsWith('/api/')) return json(res,404,{error:'Not found'});
  if (req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) return json(res,403,{error:'Origin not allowed'});
  const path = new URL(req.url,'http://localhost');
  if (path.search) return json(res,404,{error:'Not found'});
  if (path.pathname === '/api/login' && req.method === 'POST') {
    if (req.headers.origin !== ALLOWED_ORIGIN) return json(res,403,{error:'Origin required'});
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    if (attempts.size > 10000) attempts.clear();
    const bucket = attempts.get(ip) || {count:0,reset:now+15*60000};
    if (bucket.reset < now) {bucket.count=0;bucket.reset=now+15*60000;}
    if (++bucket.count > 10) {attempts.set(ip,bucket);return json(res,429,{error:'Try later'});}
    attempts.set(ip,bucket);
    try {
      const body=await readJson(req);
      const email=normalizeEmail(body.email);
      if(typeof body.password!=='string') throw Error('Invalid password');
      const found=await pool.query('SELECT id,password_hash,role FROM public.gps_accounts WHERE email=$1 AND active=true',[email]);
      const account=found.rows[0];
      // Never disclose whether an account exists.
      const dummy='scrypt$00000000000000000000000000000000$'+'00'.repeat(64);
      const ok=await verifyPassword(body.password,account?.password_hash||dummy);
      if(!account||!ok)return json(res,401,{error:'Invalid credentials'});
      const token=randomBytes(32).toString('hex');
      await pool.query('INSERT INTO public.gps_sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)',[tokenHash(token),account.id,new Date(now+SESSION_MS)]);
      res.setHeader('Set-Cookie',cookie('gps_session',token,SESSION_MS/1000));
      return json(res,200,{authenticated:true,role:account.role});
    } catch(err) {
      if(err instanceof SyntaxError || /Invalid|large/.test(err.message)) return json(res,400,{error:'Invalid request'});
      console.error('Login failed:',err.message);
      return json(res,503,{error:'Service unavailable'});
    }
  }
  if (path.pathname === '/api/logout' && req.method === 'POST') {
    if(req.headers.origin !== ALLOWED_ORIGIN) return json(res,403,{error:'Origin required'});
    try {
      const token=sessionToken(req);
      if(token) await pool.query('DELETE FROM public.gps_sessions WHERE token_hash=$1',[tokenHash(token)]);
      res.setHeader('Set-Cookie',cookie('gps_session','',0));
      return json(res,200,{authenticated:false});
    } catch(err){return json(res,503,{error:'Service unavailable'});}
  }
  if (req.method !== 'GET') return json(res,405,{error:'Method not allowed'});
  if (!['/api/me','/api/vehicles','/api/positions'].includes(path.pathname)) return json(res,404,{error:'Not found'});
  const legacy = req.headers.authorization === 'Bearer ' + APP_API_KEY;
  let account = null;
  if (!legacy) {
    try { account=await sessionAccount(req); }
    catch(err){console.error('Session lookup failed:',err.message);return json(res,503,{error:'Service unavailable'});}
    if(!account)return json(res,401,{error:'Unauthorized'});
  }
  if (path.pathname === '/api/me') return json(res,200,{authenticated:true,role:account?.role||'service'});
  try {
    const ids = legacy ? [...allowedIds] : (await pool.query(
      'SELECT vehicle_id FROM public.gps_account_vehicles WHERE account_id=$1 ORDER BY vehicle_id',
      [account.id]
    )).rows.map(r=>Number(r.vehicle_id));
    const authorizedIds = new Set(ids);
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
      return json(res,200,{vehicles:filterAllowedVehicles(vehicles,authorizedIds)});
    }
    const result = await pool.query(
      `SELECT DISTINCT ON (vehicle_id) vehicle_id, latitude, longitude, recorded_at
         FROM public.positions
        WHERE vehicle_id = ANY($1::bigint[])
        ORDER BY vehicle_id, recorded_at DESC`,
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
    return json(res,200,{positions:filterAllowedPositions(positions,authorizedIds)});
  } catch (err) {
    console.error('Database query failed:', err.message);
    return json(res,503,{error:'Database unavailable'});
  }
});
server.requestTimeout = 10000;
server.listen(PORT,'127.0.0.1',()=>console.log('GPS Ecuador API listening on localhost:'+PORT));
