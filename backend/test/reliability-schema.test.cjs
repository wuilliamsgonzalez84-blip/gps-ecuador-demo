'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('optional migration prepares organization membership and device telemetry',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../migrations/002_fleet_reliability.sql'),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS organizations/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS organization_users/);
 assert.match(sql,/ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at/);
 assert.match(sql,/UNIQUE INDEX CONCURRENTLY/);
 assert.doesNotMatch(sql,/^CREATE UNIQUE INDEX CONCURRENTLY/gm);
});
test('receiver skips exact repeated samples and keeps transactional writes',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../receiver.cjs'),'utf8');
 assert.match(code,/WHERE NOT EXISTS \(SELECT 1 FROM positions/);
 assert.match(code,/await client.query\('BEGIN'\)/);
 assert.match(code,/await client.query\('COMMIT'\)/);
});
