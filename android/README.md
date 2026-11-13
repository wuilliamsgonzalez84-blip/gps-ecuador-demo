# GPS Ecuador — Android

Aplicación nativa Android `ec.gpsecuador.mobile`, versión de código 0.1.1 (versionCode 2). No utiliza Traccar.

## Funciones presentes en el código
- Inicio y cierre de sesión privada con API HTTPS.
- Consulta de vehículos autorizados, últimas posiciones e historial de hasta siete días.
- Mapa integrado, visualización de varios vehículos y seguimiento voluntario del teléfono.
- Servicio de ubicación en primer plano con notificación persistente y opción de detener.
- Historial local de hasta 300 posiciones y opción de borrarlo.

## Comprobaciones efectuadas
GitHub Actions compiló APK y AAB el 10 de noviembre de 2026. La compilación no equivale a una prueba de campo del Teltonika.

## Pendientes por validar
- Reenvío automático de posiciones del teléfono que fallaron durante la desconexión. El código actual guarda historial local, pero **no** demuestra una cola de reintentos al servidor.
- Pruebas de seguimiento en pantalla bloqueada, pérdida y recuperación de datos móviles.
- Prueba end-to-end con FMC920 después de su llegada prevista el 20 de noviembre.

No reemplazar la versión en prueba cerrada sin plan de publicación y validación de regresión. No incluir credenciales en la aplicación.
