# API nativa de GPS Ecuador

La API nativa **no depende de Traccar**. Lee datos directamente de PostgreSQL, usando `backend/native/schema.sql` y el receptor `backend/native/server.js`.

## Configuración (solo servidor)
- `DATABASE_URL`: conexión privada a PostgreSQL.
- `GPS_API_KEY`: secreto aleatorio de 32 o más caracteres; **nunca en navegador**.
- `GPS_ORGANIZATION_ID`: organización que puede consultar esta instancia.
- `GPS_API_PORT`: opcional, por defecto 8090.

Instalar dependencias: `cd backend && npm install`.
Arrancar: `npm run native:api`. Escucha únicamente en `127.0.0.1`; usar un proxy privado o backend autenticado por sesión para acceso remoto.

## Endpoints
- `GET /health`: estado del proceso (no verifica base de datos).
- `GET /api/vehicles`: vehículos activos de la organización, nombre y última fecha.
- `GET /api/positions`: última posición registrada de cada vehículo activo.
- `GET /api/history?deviceId=1&from=2026-11-01T00:00:00Z&to=2026-11-02T00:00:00Z`: hasta 10.000 posiciones, máximo 31 días.

Los tres endpoints privados requieren `Authorization: Bearer <GPS_API_KEY>`.
Todas las consultas aplican `organization_id` del servidor, sin aceptar organización arbitraria desde el cliente.

## Límites importantes
- **No es una API pública para navegadores ni clientes comerciales**: falta login por usuario, autorización por rol, límites de peticiones, paginación, auditoría y seguridad operacional.
- El receptor todavía necesita validación con tramas físicas y PostgreSQL real.
- La API no ofrece WebSocket, alertas, informes ni mapas por sí sola.
- La versión anterior `backend/server.js` sigue siendo un prototipo legado con Traccar; no desplegarla para el sistema independiente.

## Panel conectado al mapa
- Abrir `http://127.0.0.1:8090/dashboard` desde el propio servidor o mediante un túnel privado seguro.
- Introducir la clave `GPS_API_KEY` solo en un equipo administrativo de confianza; el panel la mantiene en memoria y no la persiste.
- El mapa consulta `/api/vehicles` y `/api/positions` cada 15 segundos en el mismo origen. Los mosaicos visuales provienen de OpenStreetMap; las posiciones proceden de PostgreSQL.
- El panel **no está disponible en GitHub Pages**. Requiere desplegar PostgreSQL, receptor y API.
- Antes de ofrecer acceso a clientes, reemplazar el uso de clave compartida por login, sesiones HttpOnly, autorización por usuario, HTTPS, límites de peticiones y auditoría.
