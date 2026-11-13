# GPS Ecuador — Despliegue y validación (20 vehículos)

**Actualizado el 12 de noviembre de 2026.** La infraestructura ya fue creada; este documento no es una guía para reinstalarla. GPS Ecuador usa backend propio, **sin Traccar**.

## Componentes existentes
- VPS Vultr, PostgreSQL, API Node.js y receptor Teltonika.
- API privada de clientes con sesiones y permisos por vehículo.
- App Android con mapas, historial y rastreo voluntario; compilaciones APK/AAB exitosas.
- Receptor `gps-teltonika.service` y puerto TCP **5028** confirmados en revisión anterior. No cambiar el puerto sin volver a verificar el estado efectivo del proceso.

## Validaciones pendientes, no reinstalaciones
1. Confirmar con el equipo físico recepción de IMEI autorizado, paquetes AVL Codec 8/8E, ACK, deduplicación, escritura en PostgreSQL y lectura desde Android.
2. Probar backups y restauración, TLS, límites de solicitudes y monitorización sin exponer secretos.
3. Probar cola/reenvío tras desconexión del teléfono, alertas y carga para 20 vehículos.
4. Validar aislamiento multiempresa, gestión de clientes, retención de datos y operación comercial.
5. Conservar 12 probadores de Google Play durante 14 días consecutivos; después solicitar acceso a producción.

Consultar `docs/ESTADO_AUDITADO_2026-11-12.md` antes de abrir trabajos nuevos. Ninguna prueba simulada sustituye la prueba física del FMC920.
