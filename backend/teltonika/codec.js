'use strict';
// Teltonika TCP AVL Codec 8 / 8 Extended decoder. Does not perform database writes.
function crc16(data) {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xA001 : crc >>> 1;
  }
  return crc & 0xffff;
}
function parseImei(buffer) {
  if (buffer.length < 2) return null;
  const length = buffer.readUInt16BE(0);
  if (length !== 15 || buffer.length < 17) throw new Error('Invalid IMEI frame');
  const imei = buffer.toString('ascii', 2, 17);
  if (!/^\d{15}$/.test(imei)) throw new Error('Invalid IMEI');
  return { imei, bytesConsumed: 17 };
}
function decode(packet) {
  if (!Buffer.isBuffer(packet) || packet.length < 15) throw new Error('Incomplete AVL frame');
  if (packet.readUInt32BE(0) !== 0) throw new Error('Invalid preamble');
  const length = packet.readUInt32BE(4);
  if (length < 3 || length > 65536 || packet.length !== length + 12) throw new Error('Invalid frame length');
  const data = packet.subarray(8, 8 + length);
  if (packet.readUInt32BE(8 + length) !== crc16(data)) throw new Error('Invalid CRC');
  const codec = data[0];
  if (codec !== 8 && codec !== 0x8e) throw new Error('Unsupported codec');
  let p = 1;
  const requireBytes = n => { if (p + n > data.length) throw new Error('Truncated AVL record'); };
  const u8 = () => { requireBytes(1); return data[p++]; };
  const u16 = () => { requireBytes(2); const v = data.readUInt16BE(p); p += 2; return v; };
  const u32 = () => { requireBytes(4); const v = data.readUInt32BE(p); p += 4; return v; };
  const count = u8();
  if (count > 100) throw new Error('Too many AVL records');
  const records = [];
  for (let i = 0; i < count; i++) {
    requireBytes(24);
    const timestamp = Number(data.readBigUInt64BE(p)); p += 8;
    const priority = u8();
    const longitude = data.readInt32BE(p) / 1e7; p += 4;
    const latitude = data.readInt32BE(p) / 1e7; p += 4;
    const altitude = data.readInt16BE(p); p += 2;
    const angle = u16();
    const satellites = u8();
    const speed = u16();
    if (!Number.isSafeInteger(timestamp) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Invalid GPS fields');
    const extended = codec === 0x8e;
    const id = extended ? u16 : u8;
    const eventId = id();
    const total = id();
    const io = {};
    let observed = 0;
    for (const size of [1, 2, 4, 8]) {
      const n = id(); observed += n;
      if (observed > 1024) throw new Error('Too many IO elements');
      for (let j = 0; j < n; j++) {
        const key = id();
        requireBytes(size);
        io[key] = data.subarray(p, p + size).toString('hex');
        p += size;
      }
    }
    if (extended) {
      const variableCount = u16();
      observed += variableCount;
      if (observed > 1024) throw new Error('Too many IO elements');
      for (let j = 0; j < variableCount; j++) {
        const key = u16();
        const size = u16();
        if (size > 4096) throw new Error('IO element too large');
        requireBytes(size);
        io[key] = data.subarray(p, p + size).toString('hex');
        p += size;
      }
    }
    if (observed !== total) throw new Error('IO count mismatch');
    records.push({ timestamp, priority, latitude, longitude, altitude, angle, satellites, speed, eventId, io });
  }
  if (u8() !== count || p !== data.length) throw new Error('AVL record count or trailing bytes mismatch');
  return { codec, count, records };
}
module.exports = { crc16, parseImei, decode };
