'use strict';
// Isolated TCP integration test. Uses a fake database and never contacts Vultr.
const test=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const Module=require('node:module');
const {crc16}=require('../teltonika.cjs');
const originalLoad=Module._load;
const writes=[];
const pool={
 query:async(sql,args)=>{
  if(sql.includes('SELECT id FROM devices'))return {rowCount:1,rows:[{id:1}]};
  throw Error('Unexpected pool query: '+sql);
 },
 connect:async()=>({
  query:async(sql,args)=>{
   if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rowCount:0,rows:[]};
   if(sql.includes('SELECT vehicle_id FROM devices'))return {rowCount:1,rows:[{vehicle_id:Number(args[0].slice(-2))}]};
   if(sql.includes('INSERT INTO positions')){writes.push(args);return {rowCount:1,rows:[]};}
   throw Error('Unexpected client query: '+sql);
  },
  release:()=>{}
 })
};
function frameFor(i){
 const d=Buffer.alloc(33);let p=0;
 d[p++]=8;d[p++]=1;
 d.writeBigUInt64BE(BigInt(Date.UTC(2026,10,7,12,0,i)),p);p+=8;
 d[p++]=0;d.writeInt32BE(Math.round((-78.5-i*0.01)*1e7),p);p+=4;
 d.writeInt32BE(Math.round((-0.2-i*0.01)*1e7),p);p+=4;
 d.writeInt16BE(100,p);p+=2;d.writeUInt16BE(90,p);p+=2;
 d[p++]=8;d.writeUInt16BE(35,p);p+=2;d[p++]=0;d[p++]=0;
 for(let j=0;j<4;j++)d[p++]=0;
 d[p++]=1;assert.equal(p,d.length);
 const f=Buffer.alloc(d.length+12);
 f.writeUInt32BE(d.length,4);d.copy(f,8);f.writeUInt32BE(crc16(d),8+d.length);
 return f;
}
function device(i,port){
 return new Promise((resolve,reject)=>{
  const socket=net.connect({host:'127.0.0.1',port});
  const imei='0000000000000'+String(i).padStart(2,'0');
  const handshake=Buffer.concat([Buffer.from([0,15]),Buffer.from(imei)]);
  let received=Buffer.alloc(0),stage=0;
  const timer=setTimeout(()=>{socket.destroy();reject(Error('TCP device timed out: '+i));},5000);
  const finish=(err)=>{clearTimeout(timer);socket.destroy();err?reject(err):resolve();};
  socket.on('connect',()=>{ // Fragment IMEI to exercise buffering.
   socket.write(handshake.subarray(0,4));
   socket.write(handshake.subarray(4));
  });
  socket.on('data',chunk=>{
   received=Buffer.concat([received,chunk]);
   if(stage===0&&received.length>=1){
    const accepted=received[0];received=received.subarray(1);
    if(accepted!==1)return finish(Error('IMEI rejected: '+i));
    stage=1;
    const frame=frameFor(i);
    socket.write(frame.subarray(0,9));socket.write(frame.subarray(9));
   }
   if(stage===1&&received.length>=4){
    const ack=received.readUInt32BE(0);
    if(ack!==1)return finish(Error('Wrong ACK: '+ack));
    stage=2;finish();
   }
  });
  socket.on('error',finish);
 });
}
test('20 concurrent TCP Teltonika sessions save positions and acknowledge',async()=>{
 const receiverPath=require.resolve('../receiver.cjs');
 const dbPath=require.resolve('../db.cjs');
 const previousPort=process.env.GPS_PORT;
 const serverModule=require('node:module');
 const oldLoad=serverModule._load;
 let server;
 try{
  // receiver.cjs is a side-effect entrypoint; substitute its DB dependency.
  serverModule._load=function(request,parent,isMain){
   if(parent&&parent.filename===receiverPath&&request==='./db.cjs')return pool;
   return oldLoad.apply(this,arguments);
  };
  process.env.GPS_PORT='0';
  server=require(receiverPath);
  // receiver.cjs does not export its server yet; test only once it does.
  assert.ok(server&&typeof server.address==='function','receiver must export TCP server for isolated tests');
  if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  const port=server.address().port;
  await Promise.all(Array.from({length:20},(_,i)=>device(i,port)));
  assert.equal(writes.length,20);
  assert.equal(new Set(writes.map(row=>row[0])).size,20);
 }finally{
  serverModule._load=oldLoad;
  if(previousPort===undefined)delete process.env.GPS_PORT;else process.env.GPS_PORT=previousPort;
  if(server&&server.listening)await new Promise(resolve=>server.close(resolve));
  delete require.cache[receiverPath];
 }
});
