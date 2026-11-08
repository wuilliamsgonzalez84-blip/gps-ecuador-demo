'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('private device dashboard has accessible controls and no third-party scripts',()=>{
 const html=read('device-admin.html');
 assert.match(html,/<html lang="es">/);
 assert.match(html,/id="devices"/);
 assert.match(html,/id="search"/);
 assert.match(html,/id="refresh"/);
 assert.match(html,/role="status"/);
 assert.match(html,/src="\/device-admin.js"/);
 assert.doesNotMatch(html,/<script[^>]*https?:\/\//);
});
test('device dashboard uses private API and asks confirmation before changing device',()=>{
 const js=read('device-admin.js');
 assert.match(js,/\/api\/admin\/devices/);
 assert.match(js,/window.confirm/);
 assert.match(js,/method:'PATCH'/);
 assert.match(js,/textContent/);
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
});
test('server authenticates dashboard page, JS and CSS',()=>{
 const server=read('server.cjs');
 for(const url of ['/devices','/device-admin.js','/device-admin.css']){
  assert.ok(server.includes("app.get('"+url+"',auth,"),url+' is protected');
 }
 assert.match(read('private-map.html'),/href="\/devices"/);
});
