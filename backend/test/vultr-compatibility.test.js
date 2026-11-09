import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../server.js',import.meta.url),'utf8');
test('Vultr compatibility endpoints remain available',()=>{
  assert.match(source,/req\.url === '\/api\/health'/);
  assert.match(source,/req\.url === '\/api\/vehicles\/count'/);
  assert.match(source,/SELECT COUNT\(\*\)::int AS total FROM public\.vehicles/);
  assert.match(source,/\{total:result\.rows\[0\]\.total\}/);
});
test('private customer routes are retained',()=>{
  for(const route of ['/api/login','/api/logout','/api/me','/api/vehicles','/api/positions']) assert.ok(source.includes(route),route);
  assert.match(source,/gps_account_vehicles/);
  assert.match(source,/gps_sessions/);
});
