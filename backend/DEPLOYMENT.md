# GPS Ecuador — checklist de despliegue (sin ejecutar)

El código en GitHub **no se instala automáticamente** en Vultr. No ejecutar despliegues a ciegas ni publicar los puertos 3000 o 5027 antes de las verificaciones.

## Verificaciones previas
1. Confirmar el estado de los contenedores existentes `gps-postgres` y `gps-api`.
2. Hacer un respaldo comprobado de PostgreSQL y verificar la posibilidad de restauración.
3. Confirmar la existencia y columnas de `vehicles`, `positions` y `devices`.
4. Ejecutar `npm test` y comprobar los paquetes reales del modelo Teltonika.
5. Definir un nombre de dominio, TLS válido y un proxy inverso; la autenticación HTTP Basic provisional **no es segura sin HTTPS**.
6. Configurar `MAP_USERNAME` y `MAP_PASSWORD` como secretos fuera de GitHub, con contraseña única y robusta.
7. Aplicar reglas de firewall y límites de conexión, y establecer alertas y registros.
8. Desplegar primero en red privada, probar API y mapa, después abrir únicamente los puertos indispensables.

## Receptor
El receptor está implementado como `receiver.cjs` y agregado al perfil opcional `gps-receiver` de `compose.yaml`, sin puertos publicados. Requiere pruebas de extremo a extremo, validación de los paquetes, políticas de deduplicación y revisión de seguridad. No se debe confundir con el receptor de prueba que el usuario ejecutó en Termux.

## Estado
Mapa y API privados preparados en rama de desarrollo; no conectados todavía al servidor remoto. No existe rastreo comercial operativo.

El perfil opcional no debe activarse en producción hasta verificar el dispositivo, la persistencia, los reintentos y la política de seguridad del puerto TCP.

## Preparación comercial y de flota (pendiente de producción)
- Los endpoints autenticados `/api/fleet/status` y `/api/alerts` calculan estados de hasta 100 vehículos. No son un sistema de notificaciones push ni una prueba de carga de 20 GPS simultáneos.
- El umbral inicial de desconexión es 15 minutos. Antes de activar alertas comerciales se debe adaptar al intervalo de reporte configurado en cada FMC920 para evitar falsos positivos.
- La versión actual utiliza un único usuario HTTP Basic y **no** permite cuentas de clientes aisladas. Para vender el servicio hay que añadir organizaciones, usuarios, roles, asignación de vehículos, auditoría y aislamiento de datos por organización.
- La ubicación es información sensible. No exponerla públicamente; establecer política de retención, consentimiento, permisos, revocación de acceso y protección contra consultas excesivas.
- Verificar respaldo y restauración de PostgreSQL antes de cualquier migración, y configurar copias automáticas cifradas fuera del VPS.
- Hacer pruebas de carga con al menos 20 conexiones Teltonika simultáneas y verificar reconexiones, paquetes fragmentados, duplicados y límites de CPU/memoria.
- No se ha realizado despliegue en Vultr ni se ha probado un FMC920 real. El hardware llegará el 12 de noviembre.
