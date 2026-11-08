# Seguridad y límites actuales

**No listo para producción.**

- API enlazada a localhost y protegida por una clave compartida para llamadas entre servidores.
- Comparación de clave de tiempo constante y límite básico de 60 solicitudes/minuto por IP de conexión.
- El limitador es solo en memoria: no sustituye protección en proxy o rate limiting distribuido.
- La cabecera Origin no autentica al usuario y no es defensa suficiente.
- El token interno nunca debe enviarse a una página pública, extensión, aplicación móvil ni repositorio.
- La lista de dispositivos es una protección provisional para un solo propietario; no sirve como aislamiento comercial entre clientes.
- Antes de exponer datos: autenticación individual, autorización por organización, sesiones, auditoría, protección de abusos, HTTPS, copias de seguridad y revisión de dependencias.
- La ruta de historial necesita límites de tamaño de respuesta upstream, paginación y pruebas de carga.
- No implementar inmovilización remota sin revisión de riesgos y controles de seguridad.
