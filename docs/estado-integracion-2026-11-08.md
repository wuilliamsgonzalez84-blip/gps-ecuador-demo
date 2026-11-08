# GPS Ecuador — tareas verificadas y pendientes

Fecha de revisión: 8 de noviembre de 2026. Esta lista **no representa una prueba directa del servidor**: separa observaciones de terminal de inspección del repositorio.

| Componente | Evidencia disponible | Estado |
|---|---|---|
| VPS Vultr | Instancia creada y acceso SSH usado | Comprobado previamente |
| Receptor Teltonika | `gps-teltonika.service` activo; escucha 5028 | Comprobado previamente |
| Firewall | UFW permite 5028/tcp | Comprobado previamente |
| Codec y receptor | 8 pruebas Node.js aprobadas | Comprobado previamente |
| Base de datos | `app.js` usa `devices` y `positions`; conexión y escritura no verificadas | Pendiente de verificación |
| Ingesta física | Dispositivo todavía no recibido | Pendiente |
| API propia para consultar PostgreSQL | No existe integración confirmada en repositorio | Pendiente |
| Panel de vehículos | `index.html` muestra tres vehículos ficticios | Pendiente |
| Usuarios y aislamiento de empresas | Prototipo SQLite separado; no vinculado a Teltonika | Pendiente |
| Android | Guarda posiciones locales, no se conecta al backend vehicular | Pendiente |
| HTTPS y copias restaurables | Sin evidencia suficiente | Pendiente |
| Google Play | Documentación preparatoria; publicación no verificada | Pendiente |

## No repetir
No reinstalar Node.js, systemd, UFW, PostgreSQL ni el receptor. No volver a ejecutar pruebas unitarias salvo que cambie el código. No cambiar el puerto 5028 sin una razón técnica.

## Primera comprobación nueva imprescindible
**Una sola revisión no destructiva** del esquema PostgreSQL existente y la configuración efectiva de conexión (sin exponer secretos), para implementar la API contra tablas y columnas reales. Si ya hay una salida anterior que lo demuestra, reutilizarla. No crear tablas ni ejecutar migraciones hasta tener respaldo.

## Cambios de GitHub
Los cambios de la rama `integracion-sin-traccar-20261108` no están desplegados en Vultr ni fusionados en `main`. El script `scripts/diagnostico-vultr.sh` es de solo lectura y opcional; no ejecutarlo si ya tenemos las respuestas necesarias.

## Criterio de finalización del MVP
Un dispositivo autorizado transmite una coordenada real; el receptor la confirma; PostgreSQL la guarda; la API autenticada la devuelve solo al usuario autorizado; el mapa muestra esa coordenada con hora y estado; el historial y la reconexión funcionan; existe respaldo y restauración comprobados.
