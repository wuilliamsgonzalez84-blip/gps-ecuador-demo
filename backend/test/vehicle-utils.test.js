import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVehicle, filterAllowedVehicles, validateHistoryRange, classifyDeviceStatus, filterAllowedPositions } from '../lib/vehicle-utils.js';

test('normalizes vehicle without leaking identifiers or attributes', () => {
  assert.deepEqual(normalizeVehicle({id:1,name:'Camioneta',status:'online',lastUpdate:'2026-11-07T10:00:00Z',uniqueId:'SECRET'}),{
    id:1,name:'Camioneta',status:'online',lastUpdate:'2026-11-07T10:00:00Z'
  });
});
test('filters by server-side device allowlist', () => {
  const data=[{id:1,name:'Autorizado'},{id:2,name:'Privado'}];
  assert.deepEqual(filterAllowedVehicles(data,new Set([1])).map(d=>d.id),[1]);
});
test('rejects invalid history periods', () => {
  assert.equal(validateHistoryRange('2026-11-01T00:00:00Z','2026-11-03T00:00:00Z'),true);
  assert.equal(validateHistoryRange('2026-11-03T00:00:00Z','2026-11-01T00:00:00Z'),false);
  assert.equal(validateHistoryRange('2026-01-01T00:00:00Z','2026-11-01T00:00:00Z'),false);
});
test('classifies recent and stale updates', () => {
  const now=Date.parse('2026-11-07T12:00:00Z');
  assert.equal(classifyDeviceStatus('2026-11-07T11:55:00Z',now),'recent');
  assert.equal(classifyDeviceStatus('2026-11-07T10:00:00Z',now),'stale');
  assert.equal(classifyDeviceStatus(null,now),'unknown');
});

test('filters private vehicles and invalid GPS fixes', () => {
  const allowed = new Set([1]);
  const positions = [
    {deviceId:1,latitude:-0.18,longitude:-78.47,fixTime:'2026-11-07T12:00:00Z',speed:12,valid:true,attributes:{secret:'hidden'}},
    {deviceId:2,latitude:1,longitude:2,fixTime:'2026-11-07T12:00:00Z',valid:true},
    {deviceId:1,latitude:200,longitude:2,fixTime:'2026-11-07T12:00:00Z',valid:true},
    {deviceId:1,latitude:1,longitude:2,fixTime:'2026-11-07T12:00:00Z',valid:false}
  ];
  const result=filterAllowedPositions(positions,allowed);
  assert.equal(result.length,1);
  assert.equal(result[0].deviceId,1);
  assert.equal(result[0].latitude,-0.18);
  assert.equal('attributes' in result[0],false);
});
test('rejects GPS fixes without valid timestamp', () => {
  assert.deepEqual(filterAllowedPositions([{deviceId:1,latitude:0,longitude:0,fixTime:'invalid',valid:true}],new Set([1])),[]);
});

test('history timestamps require explicit timezone',()=>{
  assert.equal(validateHistoryRange('2026-11-01T00:00:00','2026-11-02T00:00:00'),false);
  assert.equal(validateHistoryRange('2026-11-01T00:00:00Z','2026-11-02T00:00:00Z'),true);
});
