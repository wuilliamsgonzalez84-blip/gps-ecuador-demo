import http from 'node:http';
import { filterAllowedVehicles, filterAllowedPositions, validateHistoryRange } from './lib/vehicle-utils.js';

const PORT = Number(process.env.PORT || 8080);
const TRACCAR_URL = process.env.TRACCAR_URL;
const TRACCAR_TOKEN = process.env.TRACCAR_TOKEN;
const APP_API_KEY = process.env.APP_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const DEVICE_ALLOWLIST = (process.env.DEVICE_ALLOWLIST || '').split(',').map(x => x.trim()).filter(Boolean);

if (!TRACCAR_URL || !TRACCAR_TOKEN || !APP_API_KEY || !ALLOWED_ORIGIN || !DEVICE_ALLOWLIST.length) {
  console.error('Missing required environment variables. See .env.example');
  process.exit(1);
}
if (!/^https:\/\//.test(TRACCAR_URL) && process.env.ALLOW_INSECURE_TRACCAR !== 'true') {
  console.error('TRACCAR_URL must use HTTPS');
  process.exit(1);
}
const upstream = new URL(TRACCAR_URL);
if (upstream.username || upstream.password || upstream.search || upstream.hash) throw Error('Invalid TRACCAR_URL');
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
  const provided = req.headers.authorization;
  if (provided !== 'Bearer ' + APP_API_KEY) return json(res,401,{error:'Unauthorized'});
  const path = new URL(req.url,'http://localhost');
  const history = path.pathname === '/api/history';
  if (!['/api/vehicles','/api/positions','/api/history'].includes(path.pathname)) return json(res,404,{error:'Not found'});
  if (!history && path.search) return json(res,400,{error:'Unexpected query parameters'});
  let historyParams;
  if (history) {
    const deviceId = Number(path.searchParams.get('deviceId'));
    const from = path.searchParams.get('from');
    const to = path.searchParams.get('to');
    if ([...path.searchParams.keys()].some(k => !['deviceId','from','to'].includes(k)) ||
        !Number.isSafeInteger(deviceId) || !allowedIds.has(deviceId) ||
        !validateHistoryRange(from,to)) return json(res,400,{error:'Invalid or unauthorized history request'});
    historyParams = {deviceId,from,to};
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),8000);
    let response;
    try {
      const target = new URL(history ? '/api/positions' : path.pathname === '/api/positions' ? '/api/positions' : '/api/devices',upstream);
      if (history) {
        target.searchParams.set('deviceId',String(historyParams.deviceId));
        target.searchParams.set('from',historyParams.from);
        target.searchParams.set('to',historyParams.to);
      }
      response = await fetch(target,{
        headers:{Authorization:'Bearer '+TRACCAR_TOKEN,Accept:'application/json'},
        signal:controller.signal
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) return json(res,502,{error:'Upstream unavailable'});
    const data = await response.json();
    if (!Array.isArray(data)) return json(res,502,{error:'Unexpected upstream response'});
    if (path.pathname === '/api/vehicles') {
      return json(res,200,{vehicles:filterAllowedVehicles(data,allowedIds)});
    }
    const positions = filterAllowedPositions(data,history ? new Set([historyParams.deviceId]) : allowedIds);
    if (history) {
      const fromMs=Date.parse(historyParams.from), toMs=Date.parse(historyParams.to);
      return json(res,200,{deviceId:historyParams.deviceId,positions:positions.filter(p=>{
        const time=Date.parse(p.fixTime);
        return time>=fromMs && time<=toMs;
      }).slice(0,10000)});
    }
    return json(res,200,{positions});
  } catch { return json(res,502,{error:'Upstream unavailable'}); }
});
server.requestTimeout = 10000;
server.listen(PORT,'127.0.0.1',()=>console.log('GPS API listening on localhost:'+PORT));
