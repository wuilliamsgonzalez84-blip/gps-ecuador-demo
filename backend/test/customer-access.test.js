import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,normalizeEmail,allowedVehicleIds} from '../lib/customer-auth.js';
import {filterAllowedVehicles,filterAllowedPositions} from '../lib/vehicle-utils.js';

test('password hashing uses unique salts and rejects incorrect passwords',async()=>{
 const pass='TestPassphrase!2026';
 const one=await hashPassword(pass),two=await hashPassword(pass);
 assert.notEqual(one,two);
 assert.equal(await verifyPassword(pass,one),true);
 assert.equal(await verifyPassword('incorrect',one),false);
 assert.equal(await verifyPassword(pass,'invalid'),false);
});
test('email normalized consistently',()=>{
 assert.equal(normalizeEmail('  CLIENTE@Example.COM  '),'cliente@example.com');
 assert.throws(()=>normalizeEmail('bad-email'));
});
test('account vehicle assignments never include another client',async()=>{
 const pool={query:async(sql,params)=>{
  assert.match(sql,/WHERE account_id=\$1/);
  return {rows:params[0]===1?[{vehicle_id:101}]:[{vehicle_id:202}]};
 }};
 const alice=await allowedVehicleIds(pool,1);
 const bob=await allowedVehicleIds(pool,2);
 assert.deepEqual([...alice],[101]);
 assert.deepEqual([...bob],[202]);
 const vehicles=[{id:101,name:'A'},{id:202,name:'B'}];
 const positions=[{deviceId:101,latitude:-0.2,longitude:-78.5,fixTime:'2026-11-09T00:00:00Z',valid:true},{deviceId:202,latitude:-2.1,longitude:-79.9,fixTime:'2026-11-09T00:00:00Z',valid:true}];
 assert.deepEqual(filterAllowedVehicles(vehicles,alice).map(v=>v.id),[101]);
 assert.deepEqual(filterAllowedVehicles(vehicles,bob).map(v=>v.id),[202]);
 assert.deepEqual(filterAllowedPositions(positions,alice).map(v=>v.deviceId),[101]);
 assert.deepEqual(filterAllowedPositions(positions,bob).map(v=>v.deviceId),[202]);
});
