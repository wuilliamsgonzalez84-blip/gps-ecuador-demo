'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('private-tracking.html','utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
test('embedded JS parses',()=>{assert.ok(script);new vm.Script(script)});
test('uses existing customer API contract',()=>{
 for(const path of ['/api/customer/login','/api/customer/logout','/api/customer/vehicles','/api/customer/positions'])assert.ok(html.includes(path),path);
 assert.ok(html.includes('p.vehicleId'));assert.ok(html.includes('p.recordedAt'));
});
test('requires TLS and authenticated access',()=>{
 assert.match(html,/location\.protocol\s*!==\s*'https:'/);
 assert.match(html,/Authorization:'Bearer '\+token/);
 assert.match(html,/response\.status===401\|\|response\.status===403/);
 assert.match(html,/credentials:'same-origin'/);
});
test('does not embed a static API key or persist access tokens',()=>{
 assert.doesNotMatch(html,/APP_API_KEY|GPS_VULTR_SSH_KEY|localStorage|sessionStorage/);
 assert.match(html,/let token=null/);
});
test('renders location labels safely',()=>{
 assert.match(html,/strong\.textContent=name/);
 assert.match(html,/li\.textContent=name/);
 assert.doesNotMatch(html,/innerHTML\s*=/);
});
