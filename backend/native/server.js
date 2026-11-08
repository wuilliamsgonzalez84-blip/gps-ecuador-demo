import net from 'node:net';
import {parseImeiFrame,packetLength,decodeAvlPacket} from './teltonika.js';
import {createPositionStore} from './store.js';

// Native GPS receiver prototype. Explicitly provision device IMEIs via env.
// This process is not ready for public Internet exposure until persistent storage,
// replay protection, rate limits and operational hardening are added.
const port=Number(process.env.GPS_TCP_PORT||5027);
const allowed=new Set((process.env.GPS_ALLOWED_IMEIS||'').split(',').map(x=>x.trim()).filter(Boolean));
if(!allowed.size || [...allowed].some(x=>!/^\d{15}$/.test(x)))throw Error('Set GPS_ALLOWED_IMEIS to provisioned 15-digit IMEIs');
const store=createPositionStore(process.env.DATABASE_URL);
const server=net.createServer(socket=>{
  socket.setTimeout(30000);
  let buffer=Buffer.alloc(0),imei=null,busy=false;
  socket.on('timeout',()=>socket.destroy());
  socket.on('error',()=>{});
  socket.on('data',chunk=>{
    if(busy)return socket.destroy();
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
        busy=true;
        socket.pause();
        store.save(imei,records).then(count=>{
          if(socket.destroyed)return;
          const ack=Buffer.alloc(4);
          ack.writeUInt32BE(count);
          socket.write(ack);
          busy=false;
          socket.resume();
          if(buffer.length)socket.emit('data',Buffer.alloc(0));
        }).catch(()=>socket.destroy());
        return;
      }
    }catch{return socket.destroy();}
  });
});
server.listen(port,process.env.GPS_BIND_HOST||'127.0.0.1',()=>console.log('Native GPS receiver listening on port '+port));
