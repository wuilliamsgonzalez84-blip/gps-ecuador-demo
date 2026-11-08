# Decisión técnica: GPS Ecuador SIN Traccar

## Alcance acordado
GPS Ecuador recibirá telemetría directamente de los rastreadores. No usará Traccar como dependencia de producción.

## Arquitectura objetivo
1. Un receptor TCP/TLS o TCP detrás de una capa de transporte controlada acepta conexiones de dispositivos autorizados.
2. Un decodificador del protocolo Teltonika Codec 8 / Codec 8 Extended valida encabezado, IMEI, tamaño de paquetes, CRC, cantidad de registros y coordenadas; responde ACK solo a datos aceptados.
3. El sistema almacena telemetría en PostgreSQL con marcas de tiempo UTC y retención definida.
4. La API privada consulta posiciones e historial aplicando permisos por usuario, organización y vehículo.
5. La aplicación muestra mapa, recorrido, alertas y estado de conexión.
6. Procesos independientes administran notificaciones y suscripciones.

## Restricciones de seguridad
- No publicar IMEI, claves, coordenadas reales ni identificadores de clientes en GitHub.
- Autenticar cada IMEI contra inventario registrado y vincularlo a una organización.
- Limitar conexiones, tamaños de mensajes, tiempo de espera y tasa de datos; manejar duplicados y reintentos.
- Mantener controles de acceso de clientes antes de abrir el servicio a terceros.
- Probar con tramas oficiales de Teltonika y luego con un FMC920 físico; no asumir compatibilidad sin validarla.

## Migración
El prototipo anterior en backend/server.js utiliza variables TRACCAR_* y es **legado temporal, no la arquitectura final**. No desplegarlo como servidor nativo de dispositivos.
El siguiente trabajo es implementar y probar el receptor de protocolo y su almacenamiento, luego sustituir la API legada.

## Dependencias externas pendientes
Sigue siendo necesario activar un VPS y disponer de conectividad/SIM de datos para el FMC920. No se necesita contratar Traccar.
