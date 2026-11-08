import test from 'node:test';
import assert from 'node:assert/strict';
import {crc16Ibm,parseImeiFrame,packetLength,decodeAvlPacket} from '../native/teltonika.js';
test('IMEI framing requires 15 digits',()=>{
  assert.equal(parseImeiFrame(Buffer.concat([Buffer.from([0,15]),Buffer.from('123456789012345')])), '123456789012345');
  assert.throws(()=>parseImeiFrame(Buffer.concat([Buffer.from([0,15]),Buffer.from('12345678901234X')])));
});
function packet(codec=8){
  const body=Buffer.alloc(2+24+(codec===0x8e?2:1)+(codec===0x8e?2:1)+4*(codec===0x8e?2:1)+(codec===0x8e?2:0)+1);
  let o=0;
  body[o++]=codec;body[o++]=1;
  body.writeBigUInt64BE(BigInt(Date.parse('2026-11-07T12:00:00Z')),o);o+=8;
  body[o++]=0;
  body.writeInt32BE(-785000000,o);o+=4;
  body.writeInt32BE(-2000000,o);o+=4;
  body.writeInt16BE(2500,o);o+=2;
  body.writeUInt16BE(180,o);o+=2;
  body[o++]=9;
  body.writeUInt16BE(55,o);o+=2;
  // Event id, total IO, four fixed-width IO count groups, variable IO count for 8E.
  const fieldSize=codec===0x8e?2:1;
  for(let i=0;i<(codec===0x8e?7:6);i++){body.fill(0,o,o+fieldSize);o+=fieldSize;}
  body[o++]=1;
  assert.equal(o,body.length);
  const result=Buffer.alloc(body.length+12);
  result.writeUInt32BE(body.length,4);
  body.copy(result,8);
  result.writeUInt32BE(crc16Ibm(body),result.length-4);
  return result;
}
test('valid Codec 8 position',()=>{
  const p=packet();
  assert.equal(packetLength(p),p.length);
  assert.deepEqual(decodeAvlPacket(p).map(x=>[x.latitude,x.longitude,x.speedKmh]),[[-0.2,-78.5,55]]);
});
test('CRC mismatch rejected',()=>{
  const p=packet();p[18]^=1;
  assert.throws(()=>decodeAvlPacket(p),/CRC/);
});
test('Codec 8E position',()=>{
  const p=packet(0x8e);
  assert.equal(decodeAvlPacket(p)[0].satellites,9);
});
