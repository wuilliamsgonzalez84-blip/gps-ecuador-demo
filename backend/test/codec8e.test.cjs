'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseFrame,crc16}=require('../teltonika.cjs');
function makeFrame({badCount=false,badIo=false}={}){
 const b=Buffer.alloc(128);let p=0;
 const u8=v=>{b.writeUInt8(v,p++);};
 const u16=v=>{b.writeUInt16BE(v,p);p+=2;};
 u8(0x8e);u8(1);
 b.writeBigUInt64BE(BigInt(Date.UTC(2026,10,8,12,0,0)),p);p+=8;
 u8(0);
 b.writeInt32BE(-785000000,p);p+=4;
 b.writeInt32BE(-2000000,p);p+=4;
 b.writeInt16BE(25,p);p+=2;
 u16(180);u8(9);u16(45);
 u16(0);u16(badIo?2:1);
 u16(1);u16(21);u8(4);
 u16(0);u16(0);u16(0);u16(0);
 u8(badCount?2:1);
 const payload=b.subarray(0,p),frame=Buffer.alloc(p+12);
 frame.writeUInt32BE(p,4);payload.copy(frame,8);frame.writeUInt32BE(crc16(payload),8+p);
 return frame;
}
test('Codec 8 Extended frame decodes coordinates and IO values',()=>{
 const records=parseFrame(makeFrame());
 assert.equal(records.length,1);
 assert.equal(records[0].latitude,-0.2);
 assert.equal(records[0].longitude,-78.5);
 assert.equal(records[0].speed,45);
 assert.equal(records[0].satellites,9);
});
test('Codec 8 Extended rejects record count mismatch',()=>assert.throws(()=>parseFrame(makeFrame({badCount:true})),/record count/));
test('Codec 8 Extended rejects IO count mismatch',()=>assert.throws(()=>parseFrame(makeFrame({badIo:true})),/IO count mismatch/));
test('Codec 8 Extended rejects CRC corruption',()=>{
 const frame=makeFrame();frame[18]^=1;
 assert.throws(()=>parseFrame(frame),/CRC mismatch/);
});
