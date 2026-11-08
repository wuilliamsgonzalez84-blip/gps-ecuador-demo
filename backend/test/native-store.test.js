import test from 'node:test';
import assert from 'node:assert/strict';
import {createPositionStore} from '../native/store.js';

const imei='123456789012345';
const record={timestamp:'2026-11-07T12:00:00Z',latitude:-0.2,longitude:-78.5,speedKmh:20,angle:180,altitude:100,satellites:8,priority:0,eventId:0};
function mockPool({provisioned=true,failInsert=false}={}){
  const calls=[];
  const client={
    async query(sql,values){
      calls.push({sql,values});
      if(sql.startsWith('SELECT'))return {rowCount:provisioned?1:0,rows:provisioned?[{id:7}]:[]};
      if(sql.startsWith('INSERT')&&failInsert)throw Error('database unavailable');
      return {rowCount:1};
    },
    release(){calls.push({sql:'RELEASE'});}
  };
  return {calls,async connect(){return client;},async end(){}};
}
test('commits valid GPS batch before reporting success',async()=>{
  const pool=mockPool();
  const store=createPositionStore(null,pool);
  assert.equal(await store.save(imei,[record]),1);
  assert.deepEqual(pool.calls.map(c=>c.sql.startsWith('INSERT')?'INSERT':c.sql.startsWith('SELECT')?'SELECT':c.sql),['BEGIN','SELECT','INSERT','COMMIT','RELEASE']);
  assert.equal(pool.calls[2].values[0],7);
});
test('rolls back when database insert fails',async()=>{
  const pool=mockPool({failInsert:true});
  await assert.rejects(createPositionStore(null,pool).save(imei,[record]),/database unavailable/);
  assert.ok(pool.calls.some(c=>c.sql==='ROLLBACK'));
  assert.equal(pool.calls.some(c=>c.sql==='COMMIT'),false);
});
test('rejects unknown device without persisting positions',async()=>{
  const pool=mockPool({provisioned:false});
  await assert.rejects(createPositionStore(null,pool).save(imei,[record]),/not provisioned/);
  assert.equal(pool.calls.some(c=>c.sql.startsWith('INSERT')),false);
});
test('rejects invalid position and rolls back',async()=>{
  const pool=mockPool();
  await assert.rejects(createPositionStore(null,pool).save(imei,[{...record,latitude:NaN}]),/Invalid position/);
  assert.ok(pool.calls.some(c=>c.sql==='ROLLBACK'));
});
