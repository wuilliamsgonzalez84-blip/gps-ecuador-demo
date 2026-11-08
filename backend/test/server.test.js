import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const env = {
  ...process.env,
  PORT: '18888',
  TRACCAR_URL: 'https://traccar.example.com',
  TRACCAR_TOKEN: 'test-token',
  APP_API_KEY: 'test-secret',
  ALLOWED_ORIGIN: 'https://example.com',
  DEVICE_ALLOWLIST: '1,2'
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

test('history endpoint requires authorization',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/history?deviceId=1&from=2026-11-01T00%3A00%3A00Z&to=2026-11-02T00%3A00%3A00Z');
  assert.equal(r.status,401);
});
test('history rejects unauthorized device',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/history?deviceId=999&from=2026-11-01T00%3A00%3A00Z&to=2026-11-02T00%3A00%3A00Z',{headers:{Authorization:'Bearer test-secret'}});
  assert.equal(r.status,400);
});
test('history rejects excessive date ranges',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/history?deviceId=1&from=2026-01-01T00%3A00%3A00Z&to=2026-11-02T00%3A00%3A00Z',{headers:{Authorization:'Bearer test-secret'}});
  assert.equal(r.status,400);
});

test('rejects incorrect API key',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/vehicles',{headers:{Authorization:'Bearer wrong-key'}});
  assert.equal(r.status,401);
});
test('rejects query parameters on current positions',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/positions?deviceId=1',{headers:{Authorization:'Bearer test-secret'}});
  assert.equal(r.status,400);
});
test('rejects malformed history dates',async()=>{
  const r=await fetch('http://127.0.0.1:18888/api/history?deviceId=1&from=bad&to=also-bad',{headers:{Authorization:'Bearer test-secret'}});
  assert.equal(r.status,400);
});
