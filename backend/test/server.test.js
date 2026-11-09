import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const env = {
  ...process.env,
  PGHOST: '127.0.0.1',
  PGPORT: '1',
  PGDATABASE: 'gps_ci_placeholder',
  PGUSER: 'gps_ci_placeholder',
  PGPASSWORD: 'not-a-real-password',
  APP_API_KEY: 'test-secret',
  ALLOWED_ORIGIN: 'https://example.com',
  DEVICE_ALLOWLIST: '1,2'
};
let child;
let baseUrl;
async function unusedLocalPort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(err => err ? reject(err) : resolve()));
  return port;
}
test.before(async () => {
  const port = await unusedLocalPort();
  baseUrl = 'http://127.0.0.1:' + port;
  child = spawn(process.execPath, ['server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: {...env, PORT: String(port)},
    stdio: 'pipe'
  });
  let output = '';
  let spawnError = null;
  child.on('error', err => { spawnError = err; });
  child.stderr.on('data', chunk => { output = (output + chunk.toString()).slice(-4000); });
  child.stdout.on('data', chunk => { output = (output + chunk.toString()).slice(-4000); });
  for (let i = 0; i < 150; i++) {
    if (spawnError || child.exitCode !== null) break;
    try {
      const response = await fetch(baseUrl + '/health', {signal: AbortSignal.timeout(500)});
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error('Server did not start (exit=' + child.exitCode + '): ' +
    (spawnError?.message || output.slice(-2000) || 'no child output'));
});
test.after(() => child?.kill());
test('health endpoint',async()=>{
  const r=await fetch(baseUrl + '/health');
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{status:'ok'});
});
test('API rejects unauthenticated access',async()=>{
  const r=await fetch(baseUrl + '/api/vehicles');
  assert.equal(r.status,401);
});
test('API rejects disallowed origin',async()=>{
  const r=await fetch(baseUrl + '/api/vehicles',{headers:{Origin:'https://untrusted.example',Authorization:'Bearer test-secret'}});
  assert.equal(r.status,403);
});
test('API rejects non-GET methods',async()=>{
  const r=await fetch(baseUrl + '/api/vehicles',{method:'POST'});
  assert.equal(r.status,405);
});
test('API rejects unknown routes',async()=>{
  const r=await fetch(baseUrl + '/api/unknown',{headers:{Authorization:'Bearer test-secret'}});
  assert.equal(r.status,404);
});

test('position endpoint requires authorization',async()=>{
  const r=await fetch(baseUrl + '/api/positions');
  assert.equal(r.status,401);
});
test('position endpoint blocks disallowed origins',async()=>{
  const r=await fetch(baseUrl + '/api/positions',{headers:{Origin:'https://other.example',Authorization:'Bearer test-secret'}});
  assert.equal(r.status,403);
});
