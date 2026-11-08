import test from 'node:test';
import assert from 'node:assert/strict';
import {canReadVehicle,visibleVehicles} from '../lib/tenant-access.js';
const owner={active:true,role:'owner',organizationId:10};
test('owner can only read own organization',()=>{
  assert.equal(canReadVehicle(owner,{id:1,organizationId:10}),true);
  assert.equal(canReadVehicle(owner,{id:2,organizationId:20}),false);
});
test('viewer must have vehicle access',()=>{
  const viewer={active:true,role:'viewer',organizationId:10,vehicleIds:[1]};
  assert.deepEqual(visibleVehicles(viewer,[{id:1,organizationId:10},{id:2,organizationId:10},{id:3,organizationId:20}]).map(x=>x.id),[1]);
});
test('inactive user cannot read vehicles',()=>{
  assert.equal(canReadVehicle({...owner,active:false},{id:1,organizationId:10}),false);
});
