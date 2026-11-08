// Persistent native GPS ingestion. Requires pg package and DATABASE_URL.
// No ACK should be sent until this transaction commits successfully.
import pg from 'pg';
const {Pool}=pg;
export function createPositionStore(connectionString, injectedPool=null){
  if(!connectionString && !injectedPool)throw Error('DATABASE_URL required');
  const pool=injectedPool || new Pool({connectionString,max:10,connectionTimeoutMillis:5000});
  return {
    async save(imei,records){
      if(!/^\d{15}$/.test(imei)||!Array.isArray(records)||records.length>100)throw Error('Invalid GPS batch');
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        const found=await client.query('SELECT id FROM gps_devices WHERE imei=$1 AND enabled=true FOR SHARE',[imei]);
        if(found.rowCount!==1)throw Error('Device not provisioned');
        const id=found.rows[0].id;
        for(const r of records){
          if(!Number.isFinite(r.latitude)||!Number.isFinite(r.longitude)||!Number.isFinite(Date.parse(r.timestamp)))throw Error('Invalid position');
          await client.query(`INSERT INTO gps_positions(device_id,fix_time,latitude,longitude,speed_kmh,heading,altitude,satellites,priority,event_id)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT(device_id,fix_time,latitude,longitude) DO NOTHING`,
            [id,r.timestamp,r.latitude,r.longitude,r.speedKmh,r.angle,r.altitude,r.satellites,r.priority,r.eventId]);
        }
        await client.query('COMMIT');
        return records.length;
      }catch(e){
        await client.query('ROLLBACK').catch(()=>{});
        throw e;
      }finally{client.release();}
    },
    async close(){await pool.end();}
  };
}
