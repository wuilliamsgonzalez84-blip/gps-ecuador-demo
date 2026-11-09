'use strict';
const { timingSafeEqual } = require('node:crypto');
const { createGpsQueries } = require('./legacy-postgres-queries.cjs');

function secureEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function send(res, status, payload) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

// Compatible con http.createServer y Express: invocar antes de rutas 404.
// Devuelve true cuando gestionó la solicitud y false si debe seguir la API existente.
function createGpsRouteHandler({ db, apiKey, allowedOrigin, authorizedVehicleIds }) {
  if (!apiKey || !allowedOrigin) throw Error('API key and origin are required');
  const gps = createGpsQueries(db, authorizedVehicleIds);
  return async function handleGpsRoutes(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname !== '/api/vehicles' && pathname !== '/api/positions') return false;
    if (req.method !== 'GET') { send(res, 405, { error: 'Method not allowed' }); return true; }
    if (req.headers.origin && req.headers.origin !== allowedOrigin) {
      send(res, 403, { error: 'Origin not allowed' }); return true;
    }
    const auth = req.headers.authorization;
    if (!secureEqual(auth, 'Bearer ' + apiKey)) {
      send(res, 401, { error: 'Unauthorized' }); return true;
    }
    try {
      if (pathname === '/api/vehicles') send(res, 200, { vehicles: await gps.vehicles() });
      else send(res, 200, { positions: await gps.positions() });
    } catch (err) {
      console.error('GPS API query failed:', err.message);
      send(res, 503, { error: 'Database unavailable' });
    }
    return true;
  };
}
module.exports = { createGpsRouteHandler };
