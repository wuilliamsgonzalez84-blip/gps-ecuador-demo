import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { filterAllowedVehicles, filterAllowedPositions } from './lib/vehicle-utils.js';

// Independent, read-only prototype. A trusted receiver must write the snapshot.
const PORT = Number(process.env.PORT || 8080);
const APP_API_KEY = process.env.APP_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const SNAPSHOT_FILE = process.env.GPS_SNAPSHOT_FILE;
const DEVICE_ALLOWLIST = (process.env.DEVICE_ALLOWLIST || '').split(',').map(x => x.trim()).filter(Boolean);
if (!APP_API_KEY || !ALLOWED_ORIGIN || !SNAPSHOT_FILE || !DEVICE_ALLOWLIST.length) {
  console.error('Missing required environment variables. See .env.example');
  process.exit(1);
}
const allowedIds = new Set(DEVICE_ALLOWLIST.map(Number));
if ([...allowedIds].some(id => !Number.isSafeInteger(id) || id <= 0)) throw Error('Invalid device allowlist');
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
    const snapshot = JSON.parse(await readFile(SNAPSHOT_FILE,'utf8'));
    if (!snapshot || !Array.isArray(snapshot.vehicles) || !Array.isArray(snapshot.positions)) {
      return json(res,503,{error:'Snapshot unavailable'});
    }
    if (path.pathname === '/api/vehicles') {
      return json(res,200,{vehicles:filterAllowedVehicles(snapshot.vehicles,allowedIds)});
    }
    return json(res,200,{positions:filterAllowedPositions(snapshot.positions,allowedIds)});
  } catch {
    return json(res,503,{error:'Snapshot unavailable'});
  }
});
server.requestTimeout = 10000;
server.listen(PORT,'127.0.0.1',()=>console.log('GPS Ecuador API listening on localhost:'+PORT));
