'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const app=require('../server.cjs');
test('health endpoint is available without credentials',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const port=server.address().port;
  const r=await fetch('http://127.0.0.1:'+port+'/api/health');
  assert.equal(r.status,200);
  assert.equal((await r.json()).sistema,'GPS Ecuador');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('positions endpoint does not expose data without credentials',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const port=server.address().port;
  const r=await fetch('http://127.0.0.1:'+port+'/api/positions/latest');
  assert.ok([401,503].includes(r.status));
  assert.equal(r.headers.get('cache-control'),'no-store');
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('history endpoint requires authentication',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/api/vehicles/1/history?from=2026-11-01&to=2026-11-02');
  assert.ok([401,503].includes(response.status));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('private panel requires authentication',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/panel');
  assert.ok([401,503].includes(response.status));
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('private map JavaScript cannot be downloaded anonymously',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/private-map.js');
  assert.ok([401,503].includes(response.status));
  assert.equal(response.headers.get('cache-control'),'no-store');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('private endpoints reject malformed credentials without crashing',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/api/positions/latest',{headers:{authorization:'Basic '+Buffer.from('invalid').toString('base64')}});
  assert.ok([401,503].includes(response.status));
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('fleet status and alerts are private',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const endpoint of ['/api/fleet/status','/api/alerts']){
   const response=await fetch(base+endpoint);
   assert.ok([401,503].includes(response.status),endpoint);
   assert.equal(response.headers.get('cache-control'),'no-store');
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('the private map HTML is not exposed to unauthenticated users',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/panel');
  assert.ok([401,503].includes(response.status));
  assert.ok(!(await response.text()).includes('id="alerts"'));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
