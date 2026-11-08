# Investigación de Traccar para GPS Ecuador (7 noviembre 2026)

## Principio
Traccar es una referencia de arquitectura y funcionalidades, **no una dependencia**. GPS Ecuador mantendrá su propio receptor de dispositivos, almacenamiento, API, autenticación y aplicación.

## Fuentes oficiales
- https://www.traccar.org/architecture/
- https://www.traccar.org/geofences/
- https://www.traccar.org/events/
- https://www.traccar.org/trips-stops/
- https://www.traccar.org/
- https://github.com/traccar/traccar (Apache-2.0)
- https://wiki.teltonika-gps.com/view/Teltonika_AVL_Protocols

## Hallazgos y decisiones

### 1. Protocolo y durabilidad — prioridad crítica
Traccar separa el transporte y los decodificadores por protocolo. Nuestro receptor debe soportar tramas TCP fragmentadas y concatenadas, handshake IMEI, Codec 8 y Codec 8 Extended, CRC-16/IBM, longitud, cantidad de registros, límites y ACK de cuatro bytes. **Enviar ACK solamente después de confirmar la transacción de almacenamiento**. Reintentos deben ser idempotentes; no registrar duplicados.
La documentación de Teltonika también describe UDP, pero para la primera versión se prioriza TCP. Nunca suponer que todos los modelos comparten el mismo protocolo.

### 2. Pipeline de posiciones
Separar recepción, decodificación, normalización, validación, persistencia, cálculo de eventos y publicación. Procesar en orden por dispositivo; aceptar posiciones históricas sin sustituir la última posición actual. Guardar tiempo del dispositivo y tiempo de recepción. Validar coordenadas y precisión; no eliminar silenciosamente datos útiles sin registrar motivo.

### 3. Tiempo real
API autenticada para consulta inicial; canal WebSocket o SSE para novedades, con verificación de permisos por organización y dispositivo. No incluir claves del servidor en JavaScript público.

### 4. Historial e informes
Rutas por fecha, resumen, kilometraje, velocidad, viajes y paradas. Los valores iniciales de referencia de Traccar para viajes/paradas son 200 metros, 180 segundos y un intervalo sin datos de 3600 segundos; deben ser configurables y validados con recorridos reales. Exportar CSV en fase inicial.

### 5. Geocercas
Círculos y polígonos primero; corredores de ruta después. Eventos de entrada/salida solo al cruzar límites, evitando alertas repetidas. Asociación a vehículo o grupo y reglas horarias.

### 6. Eventos
Registrar evento por separado de su entrega. Alertas de velocidad, encendido, batería, desconexión, geocerca y SOS según soporte del dispositivo. Reintentos de envío, historial de notificaciones y configuración por usuario. No confundir prueba de canal con prueba de regla.

### 7. Clientes y permisos
Organización, usuarios, roles, dispositivos, permisos explícitos y auditoría. Una organización no puede leer posiciones de otra. Validación en API y en canal en tiempo real. No ofrecer modo comercial antes de pruebas de aislamiento.

### 8. Operación
Métricas de conexiones y paquetes, logs sin secretos, respaldos, recuperación, retención de datos, colas y límites por dispositivo. Pruebas de carga para 20 dispositivos y crecimiento posterior.

## Fases verificables
- **Fase A**: receptor TCP + Codec 8/8E + pruebas con tramas oficiales + persistencia transaccional + ACK seguro.
- **Fase B**: API autenticada por organización, mapa y última posición; pruebas de permisos.
- **Fase C**: historial, viajes/paradas, geocercas, eventos y notificaciones.
- **Fase D**: facturación, gestión de clientes, respaldos, monitoreo, pruebas de carga y despliegue.

## Situación actual
El receptor nativo en `backend/native/` es **prototipo**: no guarda posiciones y por eso no confirma paquetes. El antiguo `backend/server.js` depende de Traccar y deberá sustituirse. Ninguna funcionalidad de esta lista debe darse por terminada solo por aparecer en este documento.

## Licencia
El proyecto Traccar declara Apache-2.0. Es válido estudiar su arquitectura y API; cualquier reutilización de código debe revisarse con sus avisos y obligaciones de licencia. Preferimos implementar código propio basado en protocolos documentados.
