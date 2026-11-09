'use strict';

// Adaptador para la API CommonJS existente en Vultr.
// No crea conexiones nuevas, no modifica tablas y no arranca servicios.
function createGpsQueries(db, authorizedVehicleIds) {
  const query = typeof db?.query === 'function'
    ? db.query.bind(db)
    : typeof db?.pool?.query === 'function'
      ? db.pool.query.bind(db.pool)
      : null;
  if (!query) throw new Error('db.js must export query() or pool.query()');
  if (!Array.isArray(authorizedVehicleIds) || !authorizedVehicleIds.length ||
      authorizedVehicleIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error('Provide explicit authorized vehicle IDs');
  }
  const ids = [...new Set(authorizedVehicleIds)];
  return {
    async vehicles() {
      const result = await query(
        `SELECT v.id, latest.recorded_at
           FROM public.vehicles v
           LEFT JOIN LATERAL (
             SELECT recorded_at FROM public.positions p
              WHERE p.vehicle_id = v.id
              ORDER BY recorded_at DESC LIMIT 1
           ) latest ON TRUE
          WHERE v.id = ANY($1::bigint[])
          ORDER BY v.id`, [ids]
      );
      return result.rows.map(row => ({
        id: Number(row.id),
        name: 'Vehículo ' + row.id,
        status: 'unknown',
        lastUpdate: row.recorded_at ? new Date(row.recorded_at).toISOString() : null
      }));
    },
    async positions() {
      const result = await query(
        `SELECT DISTINCT ON (vehicle_id) vehicle_id, latitude, longitude, recorded_at
           FROM public.positions
          WHERE vehicle_id = ANY($1::bigint[])
          ORDER BY vehicle_id, recorded_at DESC`, [ids]
      );
      return result.rows.map(row => ({
        deviceId: Number(row.vehicle_id),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        fixTime: new Date(row.recorded_at).toISOString(),
        speed: null,
        valid: true
      }));
    }
  };
}
module.exports = { createGpsQueries };
