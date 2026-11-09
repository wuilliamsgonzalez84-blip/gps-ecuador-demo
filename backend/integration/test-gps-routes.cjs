'use strict';
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createGpsRouteHandler } = require('./gps-routes.cjs');

function mockResponse() {
  const res = new EventEmitter();
  res.headers = {};
  res.setHeader = (k,v) => { res.headers[k] = v; };
  res.end = body => { res.body = JSON.parse(body); res.finished = true; };
  return res;
}
(async () => {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({sql,params});
    if (sql.includes('DISTINCT ON')) return {rows:[{vehicle_id:7,latitude:-0.18,longitude:-78.47,recorded_at:'2026-11-12T12:00:00Z'}]};
    return {rows:[{id:7,recorded_at:null}]};
  }};
  const handler = createGpsRouteHandler({db,apiKey:'test-only-secret',allowedOrigin:'https://example.test',authorizedVehicleIds:[7]});
  async function req(url,authorization,origin) {
    const res=mockResponse();
    const handled=await handler({url,method:'GET',headers:{authorization,origin}},res);
    return {handled,res};
  }
  let out=await req('/api/vehicles','Bearer test-only-secret','https://example.test');
  assert.equal(out.res.statusCode,200);
  assert.equal(out.res.body.vehicles[0].id,7);
  out=await req('/api/positions','Bearer test-only-secret','https://example.test');
  assert.equal(out.res.statusCode,200);
  assert.equal(out.res.body.positions[0].latitude,-0.18);
  assert.deepEqual(calls.map(x=>x.params),[[[7]],[[7]]]);
  out=await req('/api/positions',undefined,'https://example.test');
  assert.equal(out.res.statusCode,401);
  out=await req('/api/positions','Bearer test-only-secret','https://other.test');
  assert.equal(out.res.statusCode,403);
  out=await req('/api/health',undefined,undefined);
  assert.equal(out.handled,false);
  console.log('GPS_ROUTE_TESTS_OK');
})().catch(err=>{console.error(err);process.exitCode=1;});
