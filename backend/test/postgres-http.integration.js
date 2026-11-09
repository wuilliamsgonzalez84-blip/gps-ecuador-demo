import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import pg from 'pg';
import {hashPassword} from '../lib/customer-auth.js';

const pool = new pg.Pool();
const origin = 'https://gps.example.test';
const base = 'http://127.0.0.1:18889';
const password = 'IntegrationTestPass!2026';
const headers = {'Origin':origin,'Content-Type':'application/json'};
let child;
async function request(path,opts={}) {
  const r=await fetch(base+path,{...opts,headers:{...headers,...opts.headers}});
  return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};
}
async function login(email,pass=password) {
  return request('/api/login',{method:'POST',body:JSON.stringify({email,password:pass})});
}
try {
  await pool.query('INSERT INTO public.vehicles(id) VALUES (101),(202)');
  await pool.query(`INSERT INTO public.positions(vehicle_id,latitude,longitude,recorded_at) VALUES
    (101,-0.22,-78.51,now()),(202,-2.17,-79.92,now())`);
  const hashed=await hashPassword(password);
  const inserted=await pool.query(`INSERT INTO public.gps_accounts(email,password_hash,role)
    VALUES ('alice@example.com',$1,'client'),('bob@example.com',$1,'client')
    RETURNING id,email`,[hashed]);
  for(const a of inserted.rows) await pool.query('INSERT INTO public.gps_account_vehicles(account_id,vehicle_id) VALUES ($1,$2)',[a.id,a.email.startsWith('alice')?101:202]);
  child=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'18889',APP_API_KEY:'ci-service-secret',ALLOWED_ORIGIN:origin,DEVICE_ALLOWLIST:'101,202'},stdio:['ignore','pipe','pipe']});
  let logs='';
  child.stderr.on('data',b=>{logs+=b.toString()});
  for(let i=0;i<60;i++){try{const r=await fetch(base+'/health');if(r.ok)break;}catch{}await delay(100);}
  assert.equal((await request('/health')).status,200,'Server failed to start: '+logs);
  assert.equal((await request('/api/vehicles')).status,401);
  assert.equal((await login('alice@example.com','wrong-password')).status,401);
  assert.equal((await request('/api/login',{method:'POST',headers:{Origin:'https://attacker.test'},body:JSON.stringify({email:'alice@example.com',password})})).status,403);
  const alice=await login('alice@example.com');
  const bob=await login('bob@example.com');
  assert.equal(alice.status,200);
  assert.equal(bob.status,200);
  assert.match(alice.cookie,/HttpOnly; Secure; SameSite=Strict/);
  const aCookie=alice.cookie.split(';')[0],bCookie=bob.cookie.split(';')[0];
  const auth=cookie=>({headers:{Cookie:cookie}});
  const aVehicles=await request('/api/vehicles',auth(aCookie));
  const bVehicles=await request('/api/vehicles',auth(bCookie));
  assert.equal(aVehicles.status,200);
  assert.equal(bVehicles.status,200);
  assert.deepEqual(aVehicles.body.vehicles.map(v=>v.id),[101]);
  assert.deepEqual(bVehicles.body.vehicles.map(v=>v.id),[202]);
  const aPositions=await request('/api/positions',auth(aCookie));
  const bPositions=await request('/api/positions',auth(bCookie));
  assert.equal(aPositions.status,200);
  assert.equal(bPositions.status,200);
  assert.deepEqual(aPositions.body.positions.map(p=>p.deviceId),[101]);
  assert.deepEqual(bPositions.body.positions.map(p=>p.deviceId),[202]);
  await pool.query("UPDATE public.gps_accounts SET active=false WHERE email='bob@example.com'");
  assert.equal((await request('/api/vehicles',auth(bCookie))).status,401);
  const logout=await request('/api/logout',{method:'POST',...auth(aCookie)});
  assert.equal(logout.status,200);
  assert.equal((await request('/api/vehicles',auth(aCookie))).status,401);
  console.log('PASS: HTTP login, invalid credentials, origin, cookie security, tenant isolation, deactivation and logout against PostgreSQL');
} finally {
  child?.kill();
  await pool.end();
}
