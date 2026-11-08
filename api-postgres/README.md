# API PostgreSQL de GPS Ecuador (prototipo, sin Traccar)

Servicio HTTP de **solo lectura**, independiente del receptor Teltonika. No crea, modifica ni elimina tablas. Por defecto escucha únicamente en `127.0.0.1:8090` y no debe exponerse directamente a Internet.

## Rutas
- `GET /health`: estado del proceso (no comprueba la base de datos).
- `GET /api/vehicles`: IDs de vehículos asociados a dispositivos habilitados.
- `GET /api/positions?vehicle_id=123`: últimas 200 posiciones de un vehículo habilitado, ordenadas de más reciente a más antigua.

Las rutas `/api/*` exigen `Authorization: Bearer <GPS_API_KEY>` y las consultas usan parámetros SQL.

## Variables de entorno (NO subir valores reales a GitHub)
- `GPS_API_KEY`: secreto aleatorio de al menos 32 caracteres.
- `DATABASE_URL` **o** `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.
- `API_HOST`: por defecto `127.0.0.1`.
- `API_PORT`: por defecto `8090`.
- `API_ALLOWED_ORIGIN`: origen web permitido, si se usa un navegador con CORS.

## Suposiciones pendientes de verificar
Se basa **únicamente** en columnas observadas en el código del receptor: `devices(vehicle_id,enabled,imei)` y `positions(vehicle_id,latitude,longitude,recorded_at)`. No conocemos todavía el esquema completo del servidor ni si estas tablas existen y tienen datos. Si la estructura no coincide, devuelve 503 sin modificarla.

## Advertencia de seguridad importante
**No conectar esta API directamente al navegador ni publicar su clave.** La clave única permite consultar todos los vehículos habilitados: todavía **no implementa usuarios ni aislamiento entre empresas**. Debe quedar en localhost mientras se construyen sesiones y permisos por organización. No abrir el puerto 8090 en UFW. No sustituye a la API final para clientes.

## Para integrarla más adelante
1. Verificar el esquema real y respaldar PostgreSQL.
2. Agregar tablas o vistas de autorización por usuario/organización de acuerdo con el esquema existente.
3. Implementar sesiones, permisos por vehículo, TLS y proxy inverso.
4. Recién entonces conectar el panel de producción y probar con un GPS real.

No desplegada en Vultr; solo código guardado en la rama de integración.
