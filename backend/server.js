import http from 'node:http';

const PORT = Number(process.env.PORT || 8080);
const TRACCAR_URL = process.env.TRACCAR_URL;
const TRACCAR_TOKEN = process.env.TRACCAR_TOKEN;
const APP_API_KEY = process.env.APP_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const DEVICE_ALLOWLIST = (process.env.DEVICE_ALLOWLIST || '').split(',').map(x => x.trim()).filter(Boolean);
const MAX_BODY = 1024;
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
  if (path.pathname !== '/api/vehicles' || path.search) return json(res,404,{error:'Not found'});
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),8000);
    let response;
    try {
      response = await fetch(new URL('/api/devices',upstream),{
        headers:{Authorization:'Bearer '+TRACCAR_TOKEN,Accept:'application/json'},
        signal:controller.signal
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) return json(res,502,{error:'Upstream unavailable'});
    const devices = await response.json();
    if (!Array.isArray(devices)) return json(res,502,{error:'Unexpected upstream response'});
    const safe = devices.filter(d => allowedIds.has(d.id)).map(d => ({
      id:d.id,name:d.name,status:d.status,lastUpdate:d.lastUpdate
    }));
    return json(res,200,{vehicles:safe});
  } catch { return json(res,502,{error:'Upstream unavailable'}); }
});
server.requestTimeout = 10000;
server.listen(PORT,'127.0.0.1',()=>console.log('GPS API listening on localhost:'+PORT));
