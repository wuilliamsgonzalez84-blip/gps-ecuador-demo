// GPS Ecuador native API: private server-to-server access to our own PostgreSQL.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import pg from 'pg';
const {Pool}=pg;
const connectionString=process.env.DATABASE_URL;
const secret=process.env.GPS_API_KEY;
const orgId=Number(process.env.GPS_ORGANIZATION_ID);
const port=Number(process.env.GPS_API_PORT||8090);
if(!connectionString||!secret||Buffer.byteLength(secret)<32||!Number.isSafeInteger(orgId)||orgId<=0)throw Error('Set DATABASE_URL, GPS_API_KEY (32+ chars), GPS_ORGANIZATION_ID');
const pool=new Pool({connectionString,max:10,connectionTimeoutMillis:5000,statement_timeout:10000});
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
const auth=req=>{
  const header=req.headers.authorization||'';
  if(!header.startsWith('Bearer '))return false;
  const candidate=Buffer.from(header.slice(7)),expected=Buffer.from(secret);
  return candidate.length===expected.length&&timingSafeEqual(candidate,expected);
};
export function createNativeApi(db=pool){
  return http.createServer(async(req,res)=>{
    if(req.url==='/health'&&req.method==='GET')return json(res,200,{status:'ok'});
    if(req.url==='/dashboard'&&req.method==='GET'){
      try{const html=await readFile(new URL('./dashboard.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(html);}catch{return json(res,503,{error:'dashboard_unavailable'});}
    }
    if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'});
    if(!auth(req))return json(res,401,{error:'unauthorized'});
    const url=new URL(req.url,'http://localhost');
    const path=url.pathname;
    if(!['/api/vehicles','/api/positions','/api/history'].includes(path))return json(res,404,{error:'not_found'});
    if(url.searchParams.size && path!=='/api/history')return json(res,400,{error:'invalid_parameters'});
    try{
      if(path==='/api/vehicles'){
        const r=await db.query(`SELECT d.id,d.label,MAX(p.fix_time) AS last_fix
          FROM gps_devices d LEFT JOIN gps_positions p ON p.device_id=d.id
          WHERE d.organization_id=$1 AND d.enabled=true GROUP BY d.id,d.label ORDER BY d.id LIMIT 1000`,[orgId]);
        return json(res,200,{vehicles:r.rows.map(d=>({id:Number(d.id),name:d.label,lastFix:d.last_fix}))});
      }
      if(path==='/api/positions'){
        const r=await db.query(`SELECT DISTINCT ON (p.device_id) p.device_id,p.fix_time,p.latitude,p.longitude,p.speed_kmh,p.heading,p.satellites
          FROM gps_positions p JOIN gps_devices d ON d.id=p.device_id
          WHERE d.organization_id=$1 AND d.enabled=true ORDER BY p.device_id,p.fix_time DESC,p.id DESC`,[orgId]);
        return json(res,200,{positions:r.rows.map(safePosition)});
      }
      if(url.searchParams.size!==3||['deviceId','from','to'].some(k=>url.searchParams.getAll(k).length!==1))return json(res,400,{error:'invalid_parameters'});
      const deviceId=Number(url.searchParams.get('deviceId')),from=url.searchParams.get('from'),to=url.searchParams.get('to');
      const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
      const start=Date.parse(from),end=Date.parse(to);
      if(!Number.isSafeInteger(deviceId)||deviceId<=0||!iso.test(from)||!iso.test(to)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>31*86400000)return json(res,400,{error:'invalid_range'});
      const r=await db.query(`SELECT p.device_id,p.fix_time,p.latitude,p.longitude,p.speed_kmh,p.heading,p.satellites
        FROM gps_positions p JOIN gps_devices d ON d.id=p.device_id
        WHERE d.organization_id=$1 AND d.enabled=true AND d.id=$2 AND p.fix_time >= $3 AND p.fix_time <= $4
        ORDER BY p.fix_time ASC,p.id ASC LIMIT 10000`,[orgId,deviceId,new Date(start),new Date(end)]);
      return json(res,200,{positions:r.rows.map(safePosition)});
    }catch(e){console.error('Native API database request failed');return json(res,503,{error:'service_unavailable'});}
  });
}
function safePosition(p){return {deviceId:Number(p.device_id),fixTime:p.fix_time,latitude:Number(p.latitude),longitude:Number(p.longitude),speedKmh:p.speed_kmh===null?null:Number(p.speed_kmh),heading:p.heading,satellites:p.satellites};}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  createNativeApi().listen(port,'127.0.0.1',()=>console.log('Native API listening on localhost:'+port));
}
