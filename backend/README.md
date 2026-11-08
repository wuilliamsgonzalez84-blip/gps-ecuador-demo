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
