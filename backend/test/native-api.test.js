import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const port=18995,base='http://127.0.0.1:'+port;
let child;
test.before(async()=>{
  child=spawn(process.execPath,['native/api.js'],{cwd:new URL('../',import.meta.url),stdio:'ignore',env:{
    ...process.env,GPS_API_PORT:String(port),DATABASE_URL:'postgresql://user:password@127.0.0.1:65432/mock',
    GPS_API_KEY:'test-secret-0123456789-01234567890123456789',GPS_ORGANIZATION_ID:'1'
  }});
  for(let i=0;i<50;i++){
    try{const r=await fetch(base+'/health');if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('Native API failed to start');
});
test.after(()=>child?.kill());
test('native API health',async()=>{
  const r=await fetch(base+'/health');assert.equal(r.status,200);
});
test('native API rejects missing or incorrect key',async()=>{
  assert.equal((await fetch(base+'/api/vehicles')).status,401);
  assert.equal((await fetch(base+'/api/vehicles',{headers:{Authorization:'Bearer incorrect'}})).status,401);
});
test('native API rejects unsupported methods',async()=>{
  assert.equal((await fetch(base+'/api/vehicles',{method:'POST'})).status,405);
});
test('native API rejects invalid history range before database access',async()=>{
  const headers={Authorization:'Bearer test-secret-0123456789-01234567890123456789'};
  assert.equal((await fetch(base+'/api/history?deviceId=1&from=bad&to=bad',{headers})).status,400);
  assert.equal((await fetch(base+'/api/history?deviceId=1&deviceId=2&from=2026-11-07T00%3A00%3A00Z&to=2026-11-08T00%3A00%3A00Z',{headers})).status,400);
});
