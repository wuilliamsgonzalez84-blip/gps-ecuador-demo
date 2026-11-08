import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceMeters,insideGeofence,geofenceTransitions,tripSummary,csvPositions} from '../native/features.js';
const a={latitude:0,longitude:0,timestamp:'2026-11-07T12:00:00Z'};
const b={latitude:0,longitude:0.01,timestamp:'2026-11-07T12:05:00Z'};
const circle={id:1,type:'circle',latitude:0,longitude:0,radiusMeters:200};
test('distance and circular geofence',()=>{
  assert.ok(distanceMeters(a,b)>1000);
  assert.equal(insideGeofence(a,circle),true);
  assert.equal(insideGeofence(b,circle),false);
  assert.deepEqual(geofenceTransitions(a,b,[circle]),[{type:'geofenceExit',geofenceId:1}]);
});
test('polygon geofence',()=>{
  const fence={type:'polygon',points:[{latitude:-1,longitude:-1},{latitude:-1,longitude:1},{latitude:1,longitude:1},{latitude:1,longitude:-1}]};
  assert.equal(insideGeofence(a,fence),true);
  assert.equal(insideGeofence({latitude:2,longitude:0},fence),false);
});
test('trip summary and CSV export',()=>{
  const result=tripSummary([a,b]);
  assert.equal(result.segments,1);
  assert.ok(result.distanceMeters>1000);
  assert.match(csvPositions([a,b]),/^timestamp,latitude,longitude,speedKmh\n/);
});
