import net from 'node:net';
import {parseImeiFrame,packetLength,decodeAvlPacket} from './teltonika.js';

// Native GPS receiver prototype. Explicitly provision device IMEIs via env.
// This process is not ready for public Internet exposure until persistent storage,
// replay protection, rate limits and operational hardening are added.
const port=Number(process.env.GPS_TCP_PORT||5027);
const allowed=new Set((process.env.GPS_ALLOWED_IMEIS||'').split(',').map(x=>x.trim()).filter(Boolean));
if(!allowed.size || [...allowed].some(x=>!/^\d{15}$/.test(x)))throw Error('Set GPS_ALLOWED_IMEIS to provisioned 15-digit IMEIs');
const server=net.createServer(socket=>{
  socket.setTimeout(30000);
  let buffer=Buffer.alloc(0),imei=null,packets=0;
  socket.on('timeout',()=>socket.destroy());
  socket.on('error',()=>{});
  socket.on('data',chunk=>{
    buffer=Buffer.concat([buffer,chunk]);
    if(buffer.length>131072)return socket.destroy();
    try{
      while(true){
        if(!imei){
          if(buffer.length<2)return;
          const length=buffer.readUInt16BE(0);
          if(length!==15)return socket.destroy();
          if(buffer.length<17)return;
          const candidate=parseImeiFrame(buffer.subarray(0,17));
          buffer=buffer.subarray(17);
          if(!allowed.has(candidate)){socket.write(Buffer.from([0]));return socket.end();}
          imei=candidate;socket.write(Buffer.from([1]));
        }
        if(buffer.length<8)return;
        const length=packetLength(buffer);
        if(buffer.length<length)return;
        const records=decodeAvlPacket(buffer.subarray(0,length));
        buffer=buffer.subarray(length);
        // Deliberately no ACK until durable persistence exists.
        // Sending an ACK without storage would permanently lose GPS data.
        console.error('GPS packet validated but storage unavailable; no ACK sent');
        return socket.destroy();
      }
    }catch{return socket.destroy();}
  });
});
server.listen(port,'127.0.0.1',()=>console.log('Native GPS prototype on localhost:'+port));
