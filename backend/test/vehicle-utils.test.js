import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVehicle, filterAllowedVehicles, validateHistoryRange, classifyDeviceStatus } from '../lib/vehicle-utils.js';

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
