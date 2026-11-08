import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler, validToken, vehicleId } from './index.js';
test('token comparison', () => {
  assert.equal(validToken('correcto', 'correcto'.repeat(5)), false);
  assert.equal(validToken('x'.repeat(32), 'x'.repeat(32)), true);
  assert.equal(validToken('y'.repeat(32), 'x'.repeat(32)), false);
});
test('vehicle identifiers validated', () => {
  assert.equal(vehicleId('15'), '15');
  assert.equal(vehicleId('0'), null);
  assert.equal(vehicleId('1 OR 1=1'), null);
});
test('no SQL query without authorization', async () => {
  let calls = 0, status;
  const handler = makeHandler(async () => { calls++; return { rows: [] }; }, 'x'.repeat(32));
  await handler({ method:'GET', url:'/api/vehicles/1/positions', headers:{} }, { writeHead(code){status=code;}, end(){} });
  assert.equal(status,401);
  assert.equal(calls,0);
});
test('parameterized query with authenticated request', async () => {
  let statement, params, status;
  const handler = makeHandler(async (sql,args) => {statement=sql;params=args;return {rows:[]};}, 'x'.repeat(32));
  await handler({method:'GET',url:'/api/vehicles/42/positions?limit=10',headers:{authorization:'Bearer '+'x'.repeat(32)}},{writeHead(code){status=code;},end(){}});
  assert.equal(status,200);
  assert.deepEqual(params,['42',10]);
  assert.match(statement,/\$1/);
});
