# GPS Ecuador — backend propio, sin Traccar

Esta rama prepara una API Node.js privada con PostgreSQL. **Todavía no rastrea vehículos reales.**

## Estado
- GET /api/health: comprobación local.
- GET /api/vehicles/count: consulta a la tabla vehicles.
- Docker Compose conecta la API a gps-postgres mediante la red externa gps-ecuador-net.
- El receptor Teltonika, login, autorización, mapa real y HTTPS están pendientes.

## Requisitos
En el servidor Vultr: PostgreSQL en contenedor gps-postgres, red gps-ecuador-net, y archivo privado /opt/gps-ecuador/.env con POSTGRES_USER, POSTGRES_PASSWORD y POSTGRES_DB. Nunca subir .env al repositorio.

## Seguridad
La API no tiene autenticación: **no publicar el puerto 3000 en Internet**. No conectar aún la interfaz pública. Antes del despliegue se deben añadir autenticación, autorización por vehículo, HTTPS, copias de seguridad y límites de solicitudes.

## Próximos pasos
1. Implementar y probar Codec 8/8E de Teltonika, IMEI, ACK, CRC y fragmentación TCP.
2. Persistir ubicaciones y asociarlas a dispositivos autorizados.
3. Añadir cuentas y autorización por vehículo.
4. Conectar la interfaz y probar con un FMC920 autorizado.

## Receptor Teltonika en desarrollo
- `receiver.cjs` recibe conexiones TCP y valida IMEI contra la tabla privada `devices`.
- `teltonika.cjs` interpreta Codec 8 y 8E, comprueba CRC16 y extrae posición, velocidad y fecha.
- `npm test` ejecuta pruebas de decodificación. **No se han ejecutado todavía en el servidor.**
- Codec 8 Extended (8E) tiene una implementación inicial y pruebas unitarias; falta validar paquetes reales del FMC920 y los resultados de CI.
- El receptor exige una tabla `devices(imei,vehicle_id,enabled)`, y la tabla `positions(vehicle_id,latitude,longitude,recorded_at)`.
- No abrir el puerto TCP 5027 al público hasta completar pruebas, límites, monitoreo y medidas antiabuso.
- La configuración Docker del receptor y el despliegue real todavía están pendientes.
