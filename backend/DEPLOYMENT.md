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
El receptor está implementado como `receiver.cjs`, pero todavía no está incluido como servicio en `compose.yaml`. Requiere pruebas de extremo a extremo, validación de los paquetes, políticas de deduplicación y revisión de seguridad. No se debe confundir con el receptor de prueba que el usuario ejecutó en Termux.

## Estado
Mapa y API privados preparados en rama de desarrollo; no conectados todavía al servidor remoto. No existe rastreo comercial operativo.
