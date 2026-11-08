'use strict';
// Teltonika TCP AVL Codec 8 parser. Codec 8 Extended is intentionally rejected until tested.
function crc16(data) {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte;
    for (let i=0;i<8;i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : crc >>> 1;
  }
  return crc;
}
function parseCodec8(payload) {
  if (payload.length < 3 || payload[0] !== 8) throw Error('Unsupported codec');
  const count = payload[1];
  if (count === 0 || count > 50) throw Error('Invalid record count');
  let p=2;
  const need=n=>{if(p+n>payload.length) throw Error('Truncated AVL record');};
  const read8=()=>{need(1);return payload[p++];};
  const read16=()=>{need(2);const n=payload.readUInt16BE(p);p+=2;return n;};
  const skip=n=>{need(n);p+=n;};
  const records=[];
  for(let i=0;i<count;i++){
    need(8+1+15);
    const timestamp=Number(payload.readBigUInt64BE(p));p+=8;
    const priority=read8();
    const longitude=payload.readInt32BE(p)/1e7;p+=4;
    const latitude=payload.readInt32BE(p)/1e7;p+=4;
    const altitude=payload.readInt16BE(p);p+=2;
    const angle=read16();
    const satellites=read8();
    const speed=read16();
    read8(); // event IO ID
    const total=read8();
    let observed=0;
    for(const bytes of [1,2,4,8]){
      const n=read8();
      observed+=n;
      if(n>64 || observed>total) throw Error('Invalid IO count');
      skip(n*(1+bytes));
    }
    if(observed!==total) throw Error('IO count mismatch');
    if(!Number.isSafeInteger(timestamp)||timestamp<946684800000||timestamp>Date.now()+86400000) throw Error('Invalid timestamp');
    if(Math.abs(latitude)>90||Math.abs(longitude)>180) throw Error('Invalid coordinates');
    records.push({timestamp,priority,latitude,longitude,altitude,angle,satellites,speed});
  }
  if(read8()!==count || p!==payload.length) throw Error('AVL record count or length mismatch');
  return records;
}
function parseFrame(frame) {
  if(frame.length<12||frame.readUInt32BE(0)!==0) throw Error('Invalid preamble');
  const len=frame.readUInt32BE(4);
  if(len<3||len>8192||frame.length!==len+12) throw Error('Invalid frame length');
  const data=frame.subarray(8,8+len);
  const received=frame.readUInt32BE(8+len);
  if(received>65535||crc16(data)!==received) throw Error('CRC mismatch');
  return parseCodec8(data);
}
module.exports={crc16,parseCodec8,parseFrame};
