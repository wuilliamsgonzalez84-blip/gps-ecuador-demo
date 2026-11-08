'use strict';
// Synthetic Teltonika Codec 8 packets for development tests only.
// These are NOT real devices or a substitute for a VPS load test.
const test=require('node:test');
const assert=require('node:assert/strict');
const {crc16,parseFrame}=require('../teltonika.cjs');
function frameFor(i){
 const d=Buffer.alloc(33);
 let p=0;d[p++]=8;d[p++]=1;
 d.writeBigUInt64BE(BigInt(Date.UTC(2026,10,8,12,0,i)),p);p+=8;
 d[p++]=0;
 d.writeInt32BE(Math.round((-78.5-i*0.01)*1e7),p);p+=4;
 d.writeInt32BE(Math.round((-0.2-i*0.01)*1e7),p);p+=4;
 d.writeInt16BE(100,p);p+=2;d.writeUInt16BE(90,p);p+=2;
 d[p++]=8;d.writeUInt16BE(35,p);p+=2;
 d[p++]=0;d[p++]=0;
 for(let j=0;j<4;j++)d[p++]=0;
 d[p++]=1;
 assert.equal(p,d.length);
 const f=Buffer.alloc(d.length+12);
 f.writeUInt32BE(d.length,4);d.copy(f,8);f.writeUInt32BE(crc16(d),8+d.length);
 return f;
}
test('decode synthetic telemetry for 20 distinct vehicles',()=>{
 const records=Array.from({length:20},(_,i)=>parseFrame(frameFor(i))[0]);
 assert.equal(records.length,20);
 assert.equal(new Set(records.map(r=>r.longitude)).size,20);
 for(const r of records){
  assert.ok(r.latitude<0&&r.latitude>-90);
  assert.ok(r.longitude<0&&r.longitude>-180);
  assert.equal(r.speed,35);
  assert.equal(r.satellites,8);
 }
});
test('reject corrupted synthetic fleet packet',()=>{
 const frame=frameFor(0);
 frame[16]^=1;
 assert.throws(()=>parseFrame(frame),/CRC mismatch/);
});
