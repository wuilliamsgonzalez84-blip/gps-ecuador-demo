import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const env = {
  ...process.env,
  PORT: '18888',
  APP_API_KEY: 'test-secret',
  ALLOWED_ORIGIN: 'https://example.com',
  DEVICE_ALLOWLIST: '1,2',
  PGHOST: '127.0.0.1',
  PGDATABASE: 'gps_test',
  PGUSER: 'gps_test',
  PGPASSWORD: 'not-a-real-password'
};
let child;
test.before(async () => {
  child = spawn(process.execPath, ['server.js'], {cwd: new URL('../',import.meta.url),env,stdio:'ignore'});
  for (let i=0;i<50;i++) {
    try { await fetch('http://127.0.0.1:18888/health'); return; } catch { await new Promise(r=>setTimeout(r,100)); }
  }
  throw new Error('Server did not start');
});
test.after(() => child?.kill());
test('health endpoint',async()=>{
  const r=await fetch('http://127.0.0.1:18888/health');
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{status:'ok'});
});
test('API rejects unauthenticated access',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/vehicles');
  assert.equal(r.status,401);
});
test('API rejects disallowed origin',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/vehicles',{headers:{Origin:'https://untrusted.example',Authorization:'Bearer test-secret'}});
  assert.equal(r.status,403);
});
test('API rejects non-GET methods',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/vehicles',{method:'POST'});
  assert.equal(r.status,405);
});
test('API rejects unknown routes',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/unknown',{headers:{Authorization:'Bearer test-secret'}});
  assert.equal(r.status,404);
});

test('position endpoint requires authorization',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/positions');
  assert.equal(r.status,401);
});
test('position endpoint blocks disallowed origins',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/positions',{headers:{Origin:'https://other.example',Authorization:'Bearer test-secret'}});
  assert.equal(r.status,403);
});
