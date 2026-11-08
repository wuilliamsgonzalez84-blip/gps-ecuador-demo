import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAlerts,connectionAlert} from '../lib/alerts.js';
test('speed alert converts knots to km/h',()=>{
  assert.deepEqual(evaluateAlerts({id:1},{deviceId:1,valid:true,speed:40},{speedLimitKmh:70}),[{type:'speeding',deviceId:1,speedKmh:74,thresholdKmh:70}]);
});
test('does not alert on another vehicle',()=>{
  assert.deepEqual(evaluateAlerts({id:1},{deviceId:2,valid:true,speed:100},{speedLimitKmh:50}),[]);
});
test('stale connection alert',()=>{
  const now=Date.parse('2026-11-07T12:00:00Z');
  assert.equal(connectionAlert({id:1,lastUpdate:'2026-11-07T11:00:00Z'},now,30)?.type,'offline');
  assert.equal(connectionAlert({id:1,lastUpdate:'2026-11-07T11:50:00Z'},now,30),null);
});
