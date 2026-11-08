'use strict';
const net=require('node:net');
const pool=require('./db.cjs');
const {parseFrame}=require('./teltonika.cjs');
const PORT=Number(process.env.GPS_PORT||5027);
const MAX_BUFFER=16384;
const server=net.createServer(socket=>{
  socket.setTimeout(60000);
  let state='imei', buffer=Buffer.alloc(0), imei=null, busy=Promise.resolve();
  socket.on('data',chunk=>{
    if(buffer.length+chunk.length>MAX_BUFFER){socket.destroy();return;}
    buffer=Buffer.concat([buffer,chunk]);
    busy=busy.then(async()=>{
      while(!socket.destroyed){
        if(state==='imei'){
          if(buffer.length<2)return;
          const len=buffer.readUInt16BE(0);
          if(len!==15){socket.destroy();return;}
          if(buffer.length<2+len)return;
          const candidate=buffer.subarray(2,2+len).toString('ascii');
          buffer=buffer.subarray(2+len);
          if(!/^\d{15}$/.test(candidate)){socket.destroy();return;}
          const result=await pool.query('SELECT id FROM devices WHERE imei=$1 AND enabled=TRUE',[candidate]);
          if(result.rowCount!==1){socket.write(Buffer.from([0]));socket.end();return;}
          imei=candidate;state='avl';socket.write(Buffer.from([1]));
        }
        if(state==='avl'){
          if(buffer.length<8)return;
          if(buffer.readUInt32BE(0)!==0){socket.destroy();return;}
          const len=buffer.readUInt32BE(4);
          if(len<3||len>8192){socket.destroy();return;}
          if(buffer.length<len+12)return;
          const frame=buffer.subarray(0,len+12);
          buffer=buffer.subarray(len+12);
          let records;
          try{records=parseFrame(frame);}catch(e){console.warn('Rejected AVL frame:',e.message);socket.destroy();return;}
          const client=await pool.connect();
          try{
            await client.query('BEGIN');
            const dev=await client.query('SELECT vehicle_id FROM devices WHERE imei=$1 AND enabled=TRUE FOR UPDATE',[imei]);
            if(dev.rowCount!==1||dev.rows[0].vehicle_id===null) throw Error('Device unassigned or disabled');
            for(const r of records){
              // Teltonika can report invalid/unfixed GPS data. Acknowledge the
              // packet but never place invalid coordinates on the map.
              if(!Number.isFinite(r.latitude)||!Number.isFinite(r.longitude)||
                 Math.abs(r.latitude)>90||Math.abs(r.longitude)>180||
                 (r.latitude===0&&r.longitude===0)||
                 !Number.isFinite(r.timestamp)||
                 r.timestamp>Date.now()+5*60*1000||
                 r.timestamp<Date.UTC(2000,0,1))continue;
              await client.query('INSERT INTO positions(vehicle_id,latitude,longitude,recorded_at) SELECT $1,$2,$3,$4 WHERE NOT EXISTS (SELECT 1 FROM positions WHERE vehicle_id=$1 AND latitude=$2 AND longitude=$3 AND recorded_at=$4)',[dev.rows[0].vehicle_id,r.latitude,r.longitude,new Date(r.timestamp)]);
            }
            await client.query('COMMIT');
          }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
          const ack=Buffer.alloc(4);ack.writeUInt32BE(records.length);socket.write(ack);
          console.log('Saved AVL positions:',records.length);
        }
      }
    }).catch(err=>{console.error('Receiver error:',err.code||err.message);socket.destroy();});
  });
  socket.on('timeout',()=>socket.destroy());
  socket.on('error',err=>console.warn('Socket error:',err.code));
});
server.maxConnections=100;
server.listen(PORT,'0.0.0.0',()=>console.log('GPS Ecuador Teltonika Codec 8 TCP listening on',PORT));

// Export the listener for isolated integration tests; production behavior is unchanged.
module.exports=server;
