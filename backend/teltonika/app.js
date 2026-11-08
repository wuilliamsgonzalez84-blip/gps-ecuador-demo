'use strict';
const { Pool } = require('pg');
const { startReceiver } = require('./receiver');
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10
});
async function findVehicle(imei, db = pool) {
  const result = await db.query(
    'SELECT vehicle_id FROM devices WHERE imei=$1 AND enabled=true AND vehicle_id IS NOT NULL LIMIT 1',
    [imei]
  );
  return result.rows[0]?.vehicle_id ?? null;
}
async function authorize(imei) { return (await findVehicle(imei)) !== null; }
async function save(imei, records) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vehicleId = await findVehicle(imei, client);
    if (vehicleId === null) throw new Error('Device no longer authorized');
    for (const record of records) {
      if (!Number.isSafeInteger(record.timestamp) || record.timestamp < 946684800000 || record.timestamp > Date.now() + 86400000)
        throw new Error('Invalid GPS timestamp');
      if (record.satellites === 0 || (record.latitude === 0 && record.longitude === 0)) continue;
      await client.query(
        'INSERT INTO positions (vehicle_id,latitude,longitude,recorded_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [vehicleId, record.latitude, record.longitude, new Date(record.timestamp)]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
if (require.main === module) {
  const port = Number(process.env.GPS_PORT || 5028);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid GPS_PORT');
  startReceiver({ port, authorize, save });
  console.log('Teltonika receiver listening on port', port);
}
module.exports = { authorize, save, findVehicle };
