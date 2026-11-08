'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
const { startReceiver } = require('./receiver');
const { crc16 } = require('./codec');

function frame() {
  const data = Buffer.from([8, 0, 0]);
  const b = Buffer.alloc(data.length + 12);
  b.writeUInt32BE(data.length, 4);
  data.copy(b, 8);
  b.writeUInt32BE(crc16(data), 8 + data.length);
  return b;
}
async function setup(authorize = async () => true, save = async () => {}) {
  const server = startReceiver({ port: 0, authorize, save, logger: {warn(){},error(){}} });
  await once(server, 'listening');
  const socket = net.createConnection(server.address().port, '127.0.0.1');
  await once(socket, 'connect');
  const cleanup = () => { socket.destroy(); server.close(); };
  return { socket, cleanup };
}
function response(socket, bytes) {
  return new Promise((resolve, reject) => {
    let pending = Buffer.alloc(0);
    const onData = chunk => {
      pending = Buffer.concat([pending, chunk]);
      if (pending.length >= bytes) { socket.off('data', onData); socket.off('error', onError); resolve(pending); }
    };
    const onError = err => { socket.off('data', onData); reject(err); };
    socket.on('data', onData);
    socket.on('error', onError);
  });
}
test('accept authorized IMEI then ACK valid AVL', async t => {
  const { socket, cleanup } = await setup();
  t.after(cleanup);
  const login = response(socket, 1);
  socket.write(Buffer.concat([Buffer.from([0,15]), Buffer.from('123456789012345')]));
  assert.equal((await login)[0], 1);
  const ack = response(socket, 4);
  socket.write(frame());
  assert.equal((await ack).readUInt32BE(0), 0);
});
test('reject unauthorized IMEI', async t => {
  const { socket, cleanup } = await setup(async () => false);
  t.after(cleanup);
  const result = response(socket, 1);
  socket.write(Buffer.concat([Buffer.from([0,15]), Buffer.from('123456789012345')]));
  assert.equal((await result)[0], 0);
});
test('TCP fragmented login accepted', async t => {
  const { socket, cleanup } = await setup();
  t.after(cleanup);
  const result = response(socket, 1);
  socket.write(Buffer.from([0]));
  socket.write(Buffer.concat([Buffer.from([15]), Buffer.from('123456789012345')]));
  assert.equal((await result)[0], 1);
});
