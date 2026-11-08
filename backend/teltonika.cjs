'use strict';
// Teltonika AVL TCP Codec 8 and Codec 8 Extended (0x8E).
function crc16(data) {
  let crc=0;
  for(const byte of data){
    crc^=byte;
    for(let i=0;i<8;i++) crc=(crc&1)?((crc>>>1)^0xA001):(crc>>>1);
  }
  return crc;
}
function parseAVL(payload) {
  if(payload.length<3) throw Error('Truncated AVL header');
  const codec=payload[0];
  if(codec!==0x08 && codec!==0x8e) throw Error('Unsupported codec');
  const extended=codec===0x8e;
  let p=1;
  const need=n=>{if(n<0||p+n>payload.length)throw Error('Truncated AVL record');};
  const u8=()=>{need(1);return payload[p++];};
  const u16=()=>{need(2);const v=payload.readUInt16BE(p);p+=2;return v;};
  const skip=n=>{need(n);p+=n;};
  const readCount=()=>extended?u16():u8();
  const count=u8();
  if(count===0||count>50)throw Error('Invalid record count');
  const records=[];
  for(let i=0;i<count;i++){
    need(24);
    const timestamp=Number(payload.readBigUInt64BE(p));p+=8;
    const priority=u8();
    const longitude=payload.readInt32BE(p)/1e7;p+=4;
    const latitude=payload.readInt32BE(p)/1e7;p+=4;
    const altitude=payload.readInt16BE(p);p+=2;
    const angle=u16();
    const satellites=u8();
    const speed=u16();
    if(extended)u16();else u8(); // Event IO ID
    const total=readCount();
    if(total>256)throw Error('Invalid IO total');
    let observed=0;
    for(const bytes of [1,2,4,8]){
      const n=readCount();observed+=n;
      if(observed>total)throw Error('Invalid IO count');
      skip(n*((extended?2:1)+bytes));
    }
    if(extended){
      const n=readCount();observed+=n;
      if(observed>total)throw Error('Invalid NX count');
      for(let j=0;j<n;j++){
        u16();const size=u16();
        skip(size);
      }
    }
    if(observed!==total)throw Error('IO count mismatch');
    if(!Number.isSafeInteger(timestamp)||timestamp<946684800000||timestamp>Date.now()+86400000)throw Error('Invalid timestamp');
    if(Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Invalid coordinates');
    records.push({timestamp,priority,latitude,longitude,altitude,angle,satellites,speed});
  }
  if(u8()!==count||p!==payload.length)throw Error('AVL record count or length mismatch');
  return records;
}
function parseFrame(frame) {
  if(frame.length<12||frame.readUInt32BE(0)!==0)throw Error('Invalid preamble');
  const len=frame.readUInt32BE(4);
  if(len<3||len>8192||frame.length!==len+12)throw Error('Invalid frame length');
  const data=frame.subarray(8,8+len);
  const received=frame.readUInt32BE(8+len);
  if(received>65535||crc16(data)!==received)throw Error('CRC mismatch');
  return parseAVL(data);
}
module.exports={crc16,parseAVL,parseCodec8:parseAVL,parseFrame};
