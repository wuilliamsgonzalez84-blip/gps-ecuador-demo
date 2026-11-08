const test=require('node:test');
const assert=require('node:assert/strict');
const {crc16,parseFrame}=require('../teltonika.cjs');
test('CRC empty data',()=>assert.equal(crc16(Buffer.alloc(0)),0));
test('reject unsupported codec',()=>{
 const data=Buffer.from([0x0c,1,1]);
 const f=Buffer.alloc(data.length+12);
 f.writeUInt32BE(data.length,4);data.copy(f,8);f.writeUInt32BE(crc16(data),8+data.length);
 assert.throws(()=>parseFrame(f),/Unsupported codec/);
});
test('reject tampered CRC',()=>{
 const data=Buffer.from([8,1,1]);
 const f=Buffer.alloc(data.length+12);f.writeUInt32BE(data.length,4);data.copy(f,8);
 assert.throws(()=>parseFrame(f),/CRC mismatch/);
});
test('decode one Codec 8 position',()=>{
 const d=Buffer.alloc(2+8+1+15+2+1+4+1);
 let p=0;d[p++]=8;d[p++]=1;d.writeBigUInt64BE(BigInt(Date.UTC(2024,0,1)),p);p+=8;
 d[p++]=0;d.writeInt32BE(-799000000,p);p+=4;d.writeInt32BE(-23000000,p);p+=4;
 d.writeInt16BE(10,p);p+=2;d.writeUInt16BE(90,p);p+=2;d[p++]=7;d.writeUInt16BE(40,p);p+=2;
 d[p++]=0;d[p++]=0;d.fill(0,p,p+4);p+=4;d[p++]=1;
 assert.equal(p,d.length);
 const f=Buffer.alloc(d.length+12);f.writeUInt32BE(d.length,4);d.copy(f,8);f.writeUInt32BE(crc16(d),8+d.length);
 const r=parseFrame(f);assert.equal(r.length,1);assert.equal(r[0].speed,40);assert.equal(r[0].latitude,-2.3);
});

test('decode Codec 8 Extended position with variable-length IO',()=>{
 const parts=[];
 const b8=n=>{const b=Buffer.alloc(1);b[0]=n;parts.push(b);};
 const b16=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);parts.push(b);};
 b8(0x8e);b8(1);
 const stamp=Buffer.alloc(8);stamp.writeBigUInt64BE(BigInt(Date.UTC(2024,0,1)));parts.push(stamp);
 b8(0);
 const gps=Buffer.alloc(15);let p=0;
 gps.writeInt32BE(-799000000,p);p+=4;gps.writeInt32BE(-23000000,p);p+=4;
 gps.writeInt16BE(10,p);p+=2;gps.writeUInt16BE(90,p);p+=2;
 gps[p++]=7;gps.writeUInt16BE(40,p);parts.push(gps);
 b16(0);b16(1);
 for(let i=0;i<4;i++)b16(0);
 b16(1);b16(500);b16(3);parts.push(Buffer.from([1,2,3]));
 b8(1);
 const d=Buffer.concat(parts);
 const f=Buffer.alloc(d.length+12);f.writeUInt32BE(d.length,4);d.copy(f,8);f.writeUInt32BE(crc16(d),8+d.length);
 const records=parseFrame(f);
 assert.equal(records.length,1);
 assert.equal(records[0].longitude,-79.9);
 assert.equal(records[0].latitude,-2.3);
});
