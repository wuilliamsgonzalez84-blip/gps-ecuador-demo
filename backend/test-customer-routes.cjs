'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const express=require('express');
const customerRoutes=require('./customer-routes.cjs');
const scrypt=promisify(crypto.scrypt);
(async()=>{
 const salt=crypto.randomBytes(16).toString('hex');
 const stored=salt+':'+(await scrypt('testing-password',Buffer.from(salt,'hex'),64)).toString('hex');
 const tokens=new Map(),calls=[];
 const db={query:async(sql,p=[])=>{
  calls.push({sql,p});
  if(sql.includes('FROM customer_accounts WHERE email=')) return {rows:p[0]==='one@example.test'?[{id:1,password_hash:stored}]:[]};
  if(sql.includes('INSERT INTO customer_sessions')){tokens.set(p[1],p[0]);return {rows:[],rowCount:1};}
  if(sql.includes('FROM customer_sessions s JOIN'))return {rows:tokens.has(p[0])?[{id:9,customer_id:tokens.get(p[0])}]:[]};
  if(sql.includes('SELECT v.id,v.name'))return {rows:[{id:1,name:'Vehicle One'}]};
  if(sql.includes('SELECT DISTINCT ON'))return {rows:[{vehicle_id:1,latitude:1,longitude:2,recorded_at:'2026-11-14T00:00:00Z'}]};
  if(sql.includes('INSERT INTO positions'))return {rowCount:p[0]===1?1:0,rows:p[0]===1?[{vehicle_id:1}]:[]};
  if(sql.includes('SELECT p.latitude,p.longitude'))return {rows:[]};
  if(sql.includes('UPDATE customer_sessions'))return {rowCount:1,rows:[]};
  throw Error('Unexpected SQL');
 }};
 const app=express();app.use('/api/customer',customerRoutes(db));
 const server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const req=async(path,token,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.status===204?null:await r.json()};};
 try{
  assert.equal((await req('/api/customer/vehicles')).status,401);
  assert.equal((await req('/api/customer/login',null,'POST',{email:'one@example.test',password:'wrong'})).status,401);
  const login=await req('/api/customer/login',null,'POST',{email:'one@example.test',password:'testing-password'});
  assert.equal(login.status,200);const token=login.data.token;
  assert.equal((await req('/api/customer/vehicles',token)).data.vehicles[0].id,1);
  assert.equal((await req('/api/customer/positions',token)).data.positions[0].vehicleId,1);
  const from='2026-11-13T00:00:00Z',to='2026-11-14T00:00:00Z';
  assert.equal((await req('/api/customer/history?vehicleId=2&from='+from+'&to='+to,token)).status,200);
  assert(calls.some(c=>c.sql.includes('a.customer_id=$1 AND a.vehicle_id=$2')&&c.p[0]===1&&c.p[1]===2));
  const now=new Date().toISOString();
  assert.equal((await req('/api/customer/phone-position',token,'POST',{vehicleId:2,latitude:1,longitude:2,recordedAt:now})).status,403);
  assert.equal((await req('/api/customer/phone-position',token,'POST',{vehicleId:1,latitude:1,longitude:2,recordedAt:now})).status,201);
  assert.equal((await req('/api/customer/logout',token,'POST')).status,204);
  console.log('CUSTOMER_ROUTE_MOCK_TESTS_OK (not production verification)');
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
