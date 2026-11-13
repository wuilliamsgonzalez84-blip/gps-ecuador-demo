# GPS Ecuador — Estado auditado (12 noviembre 2026)

Este documento sustituye las listas históricas como guía de trabajo. No borra ni cambia servicios existentes.

## Confirmado en repositorio y CI
- Android: APK y AAB compilaron correctamente el 10 de noviembre.
- Backend: existen rutas privadas de login/logout, vehículos, posiciones, historial y subida de posición del teléfono; pruebas de CI exitosas.
- PostgreSQL: pruebas de integración de cuentas y permisos completadas.
- GitHub Pages: despliegue exitoso el 12 de noviembre.
- La app recuperó 21 posiciones del vehículo 1 según el registro de integración. Esto NO prueba el FMC920.
- El propietario confirma 12 participantes inscritos y con app instalada en la prueba cerrada; verificar fecha exacta de inicio del cómputo en Play Console.

## No repetir
No reinstalar PostgreSQL, no sustituir API ni receptor, no recrear Android, no invitar de nuevo a los 12 probadores, no instalar Traccar. No exponer secretos, IMEI ni coordenadas reales.

## Pendientes de comprobación (NO afirmar que están fallando)
1. Auditoría de solo lectura en Vultr: systemd/contenedores, puerto receptor real (registros anteriores: 5027; documento de integración: 5028), firewall, proxy TLS, endpoint autenticado, base de datos, backups y prueba de restauración.
2. Validar si el receptor existente reconoce IMEI autorizado, Codec 8/8E, ACK y deduplicación AVL.
3. Validar recuperación de posiciones del teléfono después de desconexión; el servicio guarda localmente al fallar, pero el reenvío automático no está demostrado.
4. Verificar límites de sesión, recuperación de cuentas, monitoreo y alertas; implementar únicamente tras comprobar ausencia.
5. Prueba de 20 vehículos, aislamiento multiempresa y operación comercial.
6. FMC920: llegada prevista el 20 noviembre; confirmar SIM/APN y hacer prueba real end-to-end sin asociar IMEI a vehículo equivocado.
7. Play Console: esperar los 14 días de inscripción continua y después solicitar acceso a producción, sujeto a aprobación.

## Protocolo seguro de intervención
- Primero lectura y respaldo, después cambio mínimo reversible, prueba y verificación.
- Nunca inferir que un workflow de CI demuestra funcionamiento del VPS en vivo.
- No cambiar puerto 5027/5028 sin consultar la configuración efectiva del proceso.
- Las instrucciones antiguas en docs/plan-despliegue.md y docs/lista-produccion.md son históricas y contienen referencias obsoletas a Traccar.
