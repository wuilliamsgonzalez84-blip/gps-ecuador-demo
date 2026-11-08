# API privada de GPS Ecuador (prototipo)

La API se ejecuta en localhost y **no debe exponerse directamente a Internet**.

| Ruta | Uso |
| --- | --- |
| GET /health | Salud del proceso |
| GET /api/vehicles | Metadatos de dispositivos permitidos |
| GET /api/positions | Últimas posiciones válidas de dispositivos permitidos |
| GET /api/history?deviceId=1&from=2026-11-01T00:00:00Z&to=2026-11-02T00:00:00Z | Posiciones de un vehículo permitido en intervalo de hasta 31 días |

Las rutas privadas requieren `Authorization: Bearer <APP_API_KEY>`, solo **entre servidores**. No insertar la clave en JavaScript público.

**Limitaciones pendientes:** El historial se limita a 10.000 registros por respuesta pero todavía no implementa paginación, límites de memoria de upstream, autenticación por usuario, auditoría ni control de carga. Traccar debe estar configurado y debe comprobarse compatibilidad de la API en el servidor real. No desplegar comercialmente sin completar esos controles.
