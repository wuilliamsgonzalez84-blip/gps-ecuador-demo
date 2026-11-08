import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import pg from 'pg';

// Prototipo aislado de SOLO LECTURA. No sustituye al receptor Teltonika.
// Las columnas deben verificarse contra migration.sql del servidor antes del despliegue.
export function validToken(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || expected.length < 32) return false;
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
export function vehicleId(value) {
  return /^[1-9][0-9]{0,14}$/.test(String(value)) ? String(value) : null;
}
export function makeHandler(query, secret) {
  return async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    };
    if (req.method !== 'GET') return reply(405, { error: 'Método no permitido' });
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/health') return reply(200, { ok: true, database: 'not_checked' });
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!bearer || !validToken(bearer[1], secret)) return reply(401, { error: 'No autorizado' });
    const match = /^\/api\/vehicles\/([^/]+)\/positions$/.exec(url.pathname);
    if (!match || !vehicleId(match[1])) return reply(404, { error: 'No encontrado' });
    const limit = Number(url.searchParams.get('limit') || 100);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) return reply(400, { error: 'Límite inválido' });
    try {
      const result = await query(
        'SELECT latitude, longitude, recorded_at FROM positions WHERE vehicle_id = $1 ORDER BY recorded_at DESC LIMIT $2',
        [vehicleId(match[1]), limit]
      );
      return reply(200, { vehicleId: match[1], positions: result.rows });
    } catch {
      return reply(503, { error: 'Base de datos no disponible o esquema pendiente de verificar' });
    }
  };
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  if (!process.env.DATABASE_URL || !process.env.GPS_READ_TOKEN || process.env.GPS_READ_TOKEN.length < 32) {
    console.error('Se requieren DATABASE_URL y GPS_READ_TOKEN (32+ caracteres).');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 3000 });
  const handler = makeHandler((sql, args) => pool.query(sql, args), process.env.GPS_READ_TOKEN);
  http.createServer(handler).listen(Number(process.env.PORT || 3100), '127.0.0.1', () => console.log('API PostgreSQL de prueba en localhost'));
}
