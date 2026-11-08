import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';

const upstreamPort=18991, apiPort=18992;
let upstream, child;
const startServer = server => new Promise(resolve => server.listen(upstreamPort,'127.0.0.1',resolve));
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

test.before(async()=>{
  upstream=http.createServer((req,res)=>{
    res.setHeader('Content-Type','application/json');
    if(req.headers.authorization!=='Bearer test-token'){res.statusCode=401;return res.end('{}');}
    if(req.url==='/api/devices') return res.end(JSON.stringify([
      {id:1,name:'Vehiculo propio',status:'online',lastUpdate:'2026-11-07T12:00:00Z',uniqueId:'SECRET-IMEI'},
      {id:999,name:'Ajeno',status:'online',uniqueId:'OTHER-IMEI'}
    ]));
    if(req.url==='/api/positions') return res.end(JSON.stringify([
      {deviceId:1,latitude:-0.2,longitude:-78.5,fixTime:'2026-11-07T12:00:00Z',speed:10,valid:true},
      {deviceId:999,latitude:1,longitude:1,fixTime:'2026-11-07T12:00:00Z',speed:20,valid:true}
    ]));
    if(req.url?.startsWith('/api/positions?')) return res.end(JSON.stringify([
      {deviceId:1,latitude:-0.2,longitude:-78.5,fixTime:'2026-11-07T12:00:00Z',speed:10,valid:true},
      {deviceId:1,latitude:-0.3,longitude:-78.6,fixTime:'2026-10-01T12:00:00Z',speed:10,valid:true},
      {deviceId:999,latitude:1,longitude:1,fixTime:'2026-11-07T12:00:00Z',valid:true}
    ]));
    res.statusCode=404;res.end('{}');
  });
  await startServer(upstream);
  child=spawn(process.execPath,['server.js'],{
    cwd:new URL('../',import.meta.url),
    env:{...process.env,PORT:String(apiPort),TRACCAR_URL:'http://127.0.0.1:'+upstreamPort,
      ALLOW_INSECURE_TRACCAR:'true',TRACCAR_TOKEN:'test-token',APP_API_KEY:'integration-secret',
      ALLOWED_ORIGIN:'https://example.com',DEVICE_ALLOWLIST:'1'},stdio:'ignore'
  });
  for(let i=0;i<60;i++){
    try{const r=await fetch('http://127.0.0.1:'+apiPort+'/health');if(r.ok)return;}catch{}
    await sleep(100);
  }
  throw Error('API did not start');
});
test.after(async()=>{
  child?.kill();
  if(upstream)await new Promise(resolve=>upstream.close(resolve));
});
const get=path=>fetch('http://127.0.0.1:'+apiPort+path,{headers:{Authorization:'Bearer integration-secret'}});
test('vehicle response removes identifiers and unauthorized vehicles',async()=>{
  const r=await get('/api/vehicles');
  assert.equal(r.status,200);
  const data=await r.json();
  assert.deepEqual(data.vehicles.map(v=>v.id),[1]);
  assert.equal(JSON.stringify(data).includes('IMEI'),false);
});
test('positions include only allowlisted vehicle',async()=>{
  const r=await get('/api/positions');
  assert.equal(r.status,200);
  assert.deepEqual((await r.json()).positions.map(p=>p.deviceId),[1]);
});
test('history excludes unauthorized and out-of-range positions',async()=>{
  const r=await get('/api/history?deviceId=1&from=2026-11-07T00%3A00%3A00Z&to=2026-11-08T00%3A00%3A00Z');
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.positions.length,1);
  assert.equal(data.positions[0].deviceId,1);
});
test('history refuses repeated deviceId',async()=>{
  const r=await get('/api/history?deviceId=1&deviceId=999&from=2026-11-07T00%3A00%3A00Z&to=2026-11-08T00%3A00%3A00Z');
  assert.equal(r.status,400);
});
