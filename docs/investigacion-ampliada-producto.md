# Investigación ampliada y hoja de ruta — GPS Ecuador
Fecha: 2026-11-07

## Objetivo
Construir una plataforma GPS Ecuador independiente de Traccar. Estudiar ideas y documentación pública, no depender de sus servidores ni copiar código sin revisar licencias.

## Fuentes verificadas
- Traccar: https://www.traccar.org/documentation/
- Traccar API y WebSocket: https://www.traccar.org/traccar-api/
- Traccar informes: https://www.traccar.org/reports/
- Traccar geocercas: https://www.traccar.org/geofences/
- Traccar versión 6.12: https://www.traccar.org/blog/traccar-6-12/
- API OpenAPI de Traccar: https://github.com/traccar/traccar/blob/master/openapi.yaml
- Teltonika Codec: https://wiki.teltonika-gps.com/view/Codec
- Teltonika Codec 8 Extended: https://wiki.teltonika-gps.com/view/Which_data_protocol_to_choose_Codec_8_or_Codec_8_Extended

## Capacidades priorizadas

### P0: funcionamiento real y seguridad
- Receptor TCP nativo con gestión de mensajes fragmentados/concatenados, IMEI aprovisionado, Codec 8/8E, CRC y ACK de 4 bytes **solo después de persistencia durable**.
- Almacenamiento PostgreSQL con deduplicación, índice por dispositivo y tiempo, último estado y hora de recepción.
- Autenticación web por sesión, contraseñas seguras, recuperación de acceso, roles, aislamiento de organizaciones y auditoría.
- API privada con autorización en cada consulta y eventos en vivo mediante WebSocket/SSE autenticados.
- Pruebas de protocolo con tramas reales, reinicios, desconexiones y paquetes repetidos.
- Copias de seguridad cifradas, restauración probada, monitoreo y alertas del servicio.
- Configuración compatible con FMC920 y prueba real antes de prometer soporte.

### P1: producto básico de flotas
- Mapa, búsqueda y filtros; ubicación, hora de última señal, velocidad, dirección, ignición y batería cuando el dispositivo reporte esos datos.
- Historial y reproducción; viajes, paradas, distancia y reportes CSV/PDF.
- Geocercas circulares/poligonales y alertas de entrada/salida; horarios configurables.
- Eventos de exceso de velocidad, desconexión, batería baja, ignición y SOS cuando haya datos.
- Gestión de vehículos, conductores, grupos y permisos; historial de eventos.
- Notificaciones por email y push con reintentos, preferencias y prevención de duplicados.

### P2: funciones comerciales y diferenciales
- Panel de administración, clientes, planes, cuotas, facturas y pagos; suspensiones sin pérdida de datos.
- Mantenimiento preventivo por kilometraje o fecha, vencimientos de documentos y recordatorios.
- Enlaces de seguimiento temporal con caducidad y revocación; consentimiento y controles de privacidad.
- Informes de actividad y panel ejecutivo con métricas de utilización y comportamiento.
- Geocercas de corredor, rutas programadas y desvíos.
- Configuración de idioma español, zona horaria Ecuador, unidades, accesibilidad y modo móvil.
- Exportación y eliminación de datos según políticas de retención y requisitos legales.

### P3: ampliaciones condicionadas a dispositivos y pruebas
- Comandos remotos, inmovilización o bloqueo: **no implementar sin controles fuertes, condiciones seguras y confirmación de compatibilidad**.
- Sensores de combustible, temperatura, CAN/OBD, identificación de conductores, BLE.
- Aplicación móvil nativa y API pública para integraciones empresariales.

## Criterios para declarar cada función terminada
- Código implementado, no solo documento.
- Pruebas unitarias e integración aprobadas.
- Permisos y protección de datos comprobados.
- Desplegada y verificada en un entorno real.
- Documentación de instalación y recuperación.
- Para funciones de rastreador, validación con un FMC920 real.

## Estado real
- Existe un receptor nativo y módulos de análisis iniciales en `backend/native`; no tienen persistencia durable ni API final.
- La API legada `backend/server.js` todavía depende de Traccar y NO es la arquitectura definitiva.
- No hay VPS confirmado, GPS físico conectado ni servicio comercial activo.
- Prioridad inmediata: receptor + almacenamiento + ACK transaccional, luego autenticación y mapa.
