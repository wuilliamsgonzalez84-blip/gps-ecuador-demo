// Teltonika TCP framing and Codec 8/8E location decoding (initial subset).
// Never accept a device merely because it presents an IMEI: provision it first.
export function crc16Ibm(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i=0;i<8;i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : crc >>> 1;
  }
  return crc & 0xffff;
}
export function parseImeiFrame(frame) {
  if (!Buffer.isBuffer(frame) || frame.length !== 17 || frame.readUInt16BE(0) !== 15) throw Error('Invalid IMEI frame');
  const imei=frame.subarray(2).toString('ascii');
  if (!/^\d{15}$/.test(imei)) throw Error('Invalid IMEI');
  return imei;
}
export function packetLength(header) {
  if (!Buffer.isBuffer(header) || header.length < 8 || header.readUInt32BE(0) !== 0) throw Error('Invalid preamble');
  const size=header.readUInt32BE(4);
  if (size < 3 || size > 65536) throw Error('Invalid payload size');
  return size+12;
}
export function decodeAvlPacket(packet) {
  const total=packetLength(packet);
  if (packet.length !== total) throw Error('Incomplete packet');
  const payload=packet.subarray(8,total-4);
  const expected=packet.readUInt32BE(total-4);
  if (expected !== crc16Ibm(payload)) throw Error('CRC mismatch');
  const codec=payload[0], count=payload[1];
  if (codec !== 0x08 && codec !== 0x8e) throw Error('Unsupported codec');
  if (count > 100) throw Error('Too many records');
  const extended=codec===0x8e;
  let offset=2;
  const need=n=>{if(offset+n>payload.length)throw Error('Truncated AVL record');};
  const u8=()=>{need(1);return payload[offset++];};
  const u16=()=>{need(2);const v=payload.readUInt16BE(offset);offset+=2;return v;};
  const u32=()=>{need(4);const v=payload.readUInt32BE(offset);offset+=4;return v;};
  const records=[];
  for(let i=0;i<count;i++){
    need(24);
    const time=Number(payload.readBigUInt64BE(offset));offset+=8;
    const priority=u8();
    const longitude=payload.readInt32BE(offset)/1e7;offset+=4;
    const latitude=payload.readInt32BE(offset)/1e7;offset+=4;
    const altitude=payload.readInt16BE(offset);offset+=2;
    const angle=u16(), satellites=u8(), speed=u16();
    const eventId=extended?u16():u8();
    const totalIo=extended?u16():u8();
    let readIo=0;
    for(const size of [1,2,4,8]){
      const n=extended?u16():u8();
      if(n>totalIo || readIo+n>totalIo)throw Error('Invalid IO count');
      const idSize=extended?2:1;
      need(n*(idSize+size));
      offset+=n*(idSize+size);readIo+=n;
    }
    if(extended){
      const n=u16();
      if(n>totalIo || readIo+n>totalIo)throw Error('Invalid variable IO count');
      for(let j=0;j<n;j++){u16();const length=u16();if(length>4096)throw Error('IO too large');need(length);offset+=length;}
      readIo+=n;
    }
    if(readIo!==totalIo)throw Error('IO count mismatch');
    if(!Number.isSafeInteger(time)||time<946684800000||time>Date.now()+86400000)throw Error('Invalid timestamp');
    if(Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Invalid coordinates');
    records.push({timestamp:new Date(time).toISOString(),latitude,longitude,altitude,angle,satellites,speedKmh:speed,priority,eventId});
  }
  need(1);
  if(u8()!==count || offset!==payload.length)throw Error('Record count mismatch');
  return records;
}
