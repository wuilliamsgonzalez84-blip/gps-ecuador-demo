'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseEnv,validate}=require('../scripts/check-config.cjs');
const valid={POSTGRES_USER:'gpsadmin',POSTGRES_PASSWORD:'example-database-secret',POSTGRES_DB:'gpsecuador',MAP_USERNAME:'operator',MAP_PASSWORD:'example-long-unique-map-password',DB_HOST:'gps-postgres',GPS_PORT:'5027'};
test('parses env safely without exposing secret values in findings',()=>{
 const env=parseEnv('# comment\nPOSTGRES_USER = gpsadmin\nMAP_PASSWORD="long-example-password"\n');
 assert.equal(env.POSTGRES_USER,'gpsadmin');
 assert.equal(env.MAP_PASSWORD,'long-example-password');
});
test('accepts complete offline configuration',()=>assert.deepEqual(validate(valid),[]));
test('flags missing credentials, weak map password and invalid port',()=>{
 const env={...valid,MAP_PASSWORD:'short',POSTGRES_PASSWORD:'',GPS_PORT:'99999'};
 const result=validate(env).join(' ');
 assert.match(result,/POSTGRES_PASSWORD/);
 assert.match(result,/MAP_PASSWORD/);
 assert.match(result,/GPS_PORT/);
 assert.ok(!result.includes('short'));
});
test('flags Docker localhost database hostname',()=>assert.match(validate({...valid,DB_HOST:'localhost'}).join(' '),/DB_HOST/));
