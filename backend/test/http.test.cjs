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
