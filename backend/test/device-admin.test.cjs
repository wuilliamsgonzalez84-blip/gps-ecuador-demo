'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const express=require('express');
const deviceAdmin=require('../device-admin.cjs');
async function withServer(fn){
 const queries=[];
 const pool={query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.startsWith('UPDATE'))return {rowCount:1,rows:[{id:1,imei:args[0],enabled:args[2]??true,vehicle_id:args[4]}]};
  return {rows:[{id:1,imei:'123456789012345',enabled:true,vehicle_id:1}]};
 }};
 const app=express();app.use(express.json());app.use('/api/admin',deviceAdmin(pool));
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await fn('http://127.0.0.1:'+server.address().port,queries);}
 finally{await new Promise(resolve=>server.close(resolve));}
}
test('device list returns known authorized devices',async()=>{
 await withServer(async(base)=>{
  const r=await fetch(base+'/api/admin/devices');
  assert.equal(r.status,200);
  assert.equal((await r.json()).devices[0].imei,'123456789012345');
 });
});
test('deactivation writes enabled=false without modifying vehicle assignment',async()=>{
 await withServer(async(base,queries)=>{
  const r=await fetch(base+'/api/admin/devices/123456789012345',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:false})});
  assert.equal(r.status,200);
  const q=queries[0];
  assert.equal(q.args[1],true);
  assert.equal(q.args[2],false);
  assert.equal(q.args[3],false);
 });
});
test('vehicle reassignment uses parameterized SQL',async()=>{
 await withServer(async(base,queries)=>{
  const r=await fetch(base+'/api/admin/devices/123456789012345',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({vehicle_id:2})});
  assert.equal(r.status,200);
  assert.equal(queries[0].args[4],2);
  assert.match(queries[0].sql,/EXISTS\(SELECT 1 FROM vehicles/);
 });
});
test('invalid IMEI, extra fields and invalid values are rejected before DB access',async()=>{
 await withServer(async(base,queries)=>{
  for(const [imei,body] of [
   ['123',{enabled:true}],['123456789012345',{enabled:'false'}],
   ['123456789012345',{vehicle_id:-1}],['123456789012345',{imei:'other'}],
   ['123456789012345',{}]
  ]){
   const r=await fetch(base+'/api/admin/devices/'+imei,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   assert.equal(r.status,400);
  }
  assert.equal(queries.length,0);
 });
});
test('main API protects device admin routes without credentials',async()=>{
 const app=require('../server.cjs');
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const endpoint of ['/api/admin/devices','/api/admin/devices/123456789012345']){
   const r=await fetch(base+endpoint,{method:endpoint.endsWith('devices')?'GET':'PATCH',headers:{'content-type':'application/json'},body:endpoint.endsWith('devices')?undefined:'{"enabled":false}'});
   assert.ok([401,503].includes(r.status));
   assert.equal(r.headers.get('cache-control'),'no-store');
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
});
