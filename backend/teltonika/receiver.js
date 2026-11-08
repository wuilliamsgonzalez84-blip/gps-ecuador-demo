'use strict';
const net = require('node:net');
const { parseImei, decode } = require('./codec');

// Socket framing is independent of PostgreSQL. The caller decides which IMEIs
// are authorized and commits records before returning the AVL acknowledgement.
function startReceiver({ port = 5028, authorize, save, logger = console }) {
  if (typeof authorize !== 'function' || typeof save !== 'function') throw new Error('authorize and save callbacks required');
  const server = net.createServer(socket => {
    socket.setTimeout(120000);
    let buffer = Buffer.alloc(0);
    let imei = null;
    let busy = false;
    let queued = false;
    let closed = false;
    const close = () => { closed = true; socket.destroy(); };
    socket.on('timeout', close);
    socket.on('error', error => logger.warn('GPS socket error:', error.message));
    socket.on('data', chunk => {
      if (closed) return;
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > 1024 * 1024) return close();
      if (busy) queued = true;
      else void drain();
    });
    async function drain() {
      if (busy || closed) return;
      busy = true;
      try {
        while (!closed) {
          if (!imei) {
            if (buffer.length < 2) break;
            const length = buffer.readUInt16BE(0);
            if (length !== 15) return close();
            if (buffer.length < 17) break;
            const frame = parseImei(buffer.subarray(0, 17));
            if (!frame || !await authorize(frame.imei)) {
              socket.write(Buffer.from([0]));
              return close();
            }
            imei = frame.imei;
            buffer = buffer.subarray(17);
            socket.write(Buffer.from([1]));
          } else {
            if (buffer.length < 8) break;
            if (buffer.readUInt32BE(0) !== 0) return close();
            const size = buffer.readUInt32BE(4);
            if (size < 3 || size > 65536) return close();
            if (buffer.length < size + 12) break;
            const frame = buffer.subarray(0, size + 12);
            const result = decode(frame);
            // save() must be atomic, idempotent and throw on DB failure.
            await save(imei, result.records);
            const ack = Buffer.alloc(4);
            ack.writeUInt32BE(result.count);
            socket.write(ack);
            buffer = buffer.subarray(size + 12);
          }
        }
      } catch (error) {
        logger.error('GPS packet rejected:', error.message);
        close();
      } finally {
        busy = false;
        if (!closed && queued) { queued = false; void drain(); }
      }
    }
  });
  server.listen(port, '0.0.0.0');
  return server;
}
module.exports = { startReceiver };
