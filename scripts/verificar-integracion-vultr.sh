#!/usr/bin/env bash
# Verificación remota de solo lectura: no imprime secretos ni filas GPS.
set -euo pipefail
cd /opt/gps-ecuador-staging/backend/teltonika
test -f .env && test -f app.js || { echo "ERROR: receptor o .env no encontrados"; exit 1; }
systemctl is-active --quiet gps-teltonika.service || { echo "ERROR: receptor no activo"; exit 1; }
echo "Receptor Teltonika: activo"
node --env-file=.env - <<'NODE'
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 1,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
});
(async () => {
  try {
    const result = await pool.query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name IN ('devices', 'positions')
       ORDER BY table_name, ordinal_position`
    );
    const names = new Set(result.rows.map(r => r.table_name + '.' + r.column_name));
    const required = ['devices.vehicle_id', 'devices.enabled', 'positions.vehicle_id', 'positions.latitude', 'positions.longitude', 'positions.recorded_at'];
    const missing = required.filter(name => !names.has(name));
    if (missing.length) {
      console.error('ERROR: faltan columnas necesarias: ' + missing.join(', '));
      process.exitCode = 1;
    } else {
      await pool.query('SELECT vehicle_id FROM devices WHERE enabled = true AND vehicle_id IS NOT NULL LIMIT 0');
      await pool.query('SELECT latitude, longitude, recorded_at FROM positions WHERE vehicle_id = $1 ORDER BY recorded_at DESC LIMIT 0', ['1']);
      console.log('PostgreSQL: conexión y consultas de lectura verificadas');
      console.log('Esquema: compatible con API PostgreSQL');
    }
  } catch (e) {
    console.error('ERROR: consulta de verificación falló (' + (e.code || e.name) + ')');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
NODE
echo "Verificación terminada; sin cambios en la base de datos."
