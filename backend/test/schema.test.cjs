'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('schema includes required device authorization and position index',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../migrations/001_initial.sql'),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS devices/i);
 assert.match(sql,/UNIQUE CHECK\(imei/i);
 assert.match(sql,/idx_positions_vehicle_time/i);
});
