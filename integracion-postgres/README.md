# API PostgreSQL de solo lectura — laboratorio, NO producción

Este módulo es una **primera implementación aislada** para avanzar sin tocar el receptor Teltonika que ya está funcionando en Vultr. No usa Traccar ni SQLite.

## Lo implementado
- Endpoint de salud `GET /health` (no confirma la base de datos).
- `GET /api/vehicles/:id/positions?limit=100`, protegido por token Bearer de entorno.
- Consultas parametrizadas, límites de 1 a 500 y escucha únicamente en 127.0.0.1.
- Pruebas locales de autorización, validación y parametrización.

## Pendiente antes de conectar o desplegar
1. Obtener **sin compartir contraseñas** la estructura real de `devices`, `vehicles` y `positions` del archivo `/opt/gps-ecuador-staging/backend/teltonika/migration.sql`. Este código supone provisionalmente `positions(vehicle_id, latitude, longitude, recorded_at)`; debe comprobarse.
2. Implementar autenticación real con usuarios, organizaciones y autorización por vehículo. El token único de laboratorio **no es suficiente** para una plataforma comercial o multiusuario.
3. Revisar acceso a PostgreSQL y privilegios de cuenta **solo SELECT**. No reutilizar credenciales administrativas.
4. Agregar HTTPS con proxy inverso, control de acceso, registro de auditoría, copias de seguridad y pruebas integrales.
5. No habilitar el endpoint en Internet ni desplegar este prototipo como producción.

No se han modificado la base de datos, el receptor Teltonika ni el VPS.
