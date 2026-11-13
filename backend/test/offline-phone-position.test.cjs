'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const express = require('express');
const createRoutes = require('../customer-routes.cjs');

test('offline phone positions: accepts 1-day-old authorized fix; rejects >31-day-old and future fixes', async () => {
  const token = 'a'.repeat(64);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const inserts = [];
  const db = { async query(sql, params) {
    if (sql.includes('FROM customer_sessions')) {
      assert.equal(params[0], tokenHash);
      return {rows:[{id:1,customer_id:7}]};
    }
    if (sql.includes('INSERT INTO positions')) {
      inserts.push(params);
      return {rowCount:1,rows:[{vehicle_id:42}]};
    }
    throw Error('Unexpected query: '+sql);
  }};
  const app = express();
  app.use('/api/customer', createRoutes(db));
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const send = (recordedAt) => new Promise((resolve,reject) => {
      const body = JSON.stringify({vehicleId:42,latitude:25.8,longitude:-80.2,recordedAt});
      const req = http.request({host:'127.0.0.1',port:server.address().port,path:'/api/customer/phone-position',method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res => {res.resume();res.on('end',()=>resolve(res.statusCode))});
      req.on('error',reject);req.end(body);
    });
    assert.equal(await send(new Date(Date.now()-86400000).toISOString()),201);
    assert.equal(inserts.length,1);
    assert.equal(await send(new Date(Date.now()-32*86400000).toISOString()),400);
    assert.equal(await send(new Date(Date.now()+600000).toISOString()),400);
    assert.equal(inserts.length,1);
  } finally {await new Promise(resolve=>server.close(resolve))}
});
