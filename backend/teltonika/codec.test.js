'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { crc16, parseImei, decode } = require('./codec');
function packet(payload) {
  const frame = Buffer.alloc(payload.length + 12);
  frame.writeUInt32BE(payload.length, 4);
  payload.copy(frame, 8);
  frame.writeUInt32BE(crc16(payload), frame.length - 4);
  return frame;
}
test('CRC-16/IBM standard check vector', () => {
  assert.equal(crc16(Buffer.from('123456789')), 0xbb3d);
});
test('IMEI frame', () => {
  const imei = Buffer.concat([Buffer.from([0, 15]), Buffer.from('123456789012345')]);
  assert.deepEqual(parseImei(imei), { imei: '123456789012345', bytesConsumed: 17 });
  assert.throws(() => parseImei(Buffer.from([0, 3, 49, 50, 51])));
});
test('empty Codec 8 and Codec 8E frames', () => {
  for (const codec of [8, 0x8e]) assert.deepEqual(decode(packet(Buffer.from([codec, 0, 0]))), { codec, count: 0, records: [] });
});
test('decode one Codec 8 GPS record without IO', () => {
  const record = Buffer.alloc(24 + 2 + 4);
  record.writeBigUInt64BE(1794149202648n, 0);
  record.writeInt32BE(-801916000, 9);
  record.writeInt32BE(257617000, 13);
  record[21] = 12;
  record.writeUInt16BE(45, 22);
  const payload = Buffer.concat([Buffer.from([8, 1]), record, Buffer.from([1])]);
  const result = decode(packet(payload));
  assert.equal(result.count, 1);
  assert.equal(result.records[0].latitude, 25.7617);
  assert.equal(result.records[0].longitude, -80.1916);
  assert.equal(result.records[0].speed, 45);
});
test('reject tampered frame', () => {
  const frame = packet(Buffer.from([8, 0, 0]));
  frame[8] ^= 1;
  assert.throws(() => decode(frame), /CRC/);
});
