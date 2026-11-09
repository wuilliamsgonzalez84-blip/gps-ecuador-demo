# GPS Ecuador

Plataforma propia de rastreo GPS, **sin Traccar**. El panel público actual es una demostración con datos ficticios; todavía no representa rastreo real.

## Estado comprobado
- GitHub Actions verificó correctamente la conexión SSH con Vultr (ejecución #6).
- `backend/server.js` es una API Node.js independiente de solo lectura que consulta un archivo JSON privado de posiciones y vehículos.
- La integración del receptor Teltonika con almacenamiento persistente y la API **todavía debe verificarse y completarse**.
- La aplicación pública no debe recibir claves privadas ni credenciales de servidor.

## Arquitectura objetivo
1. Receptor Teltonika FMC920 en Vultr, con validación del identificador y protocolo AVL.
2. PostgreSQL para dispositivos, vehículos, posiciones e historial; migraciones y copias de seguridad.
3. API propia HTTPS con autenticación de usuarios y autorización por vehículo.
4. Panel y Android conectados a la API; mapa e historial reales.
5. Alertas, monitoreo, retención de datos y separación por organización para futura comercialización.

## API provisional
`backend/README.md` describe el prototipo independiente: `/health`, `/api/vehicles`, `/api/positions`. Consume un snapshot privado con estructura `{"vehicles":[],"positions":[]}`; **no recibe directamente paquetes GPS ni los guarda en base de datos**. La aplicación todavía no debe presentarse como operativa para rastreo real.

## Pendientes prioritarios
1. Verificar los servicios realmente instalados en Vultr sin borrar configuraciones existentes.
2. Conectar el receptor Teltonika al almacenamiento persistente y comprobar datos reales con un dispositivo autorizado.
3. Implementar autenticación de usuarios, permisos, HTTPS, registros y pruebas.
4. Sustituir el panel demostrativo por consultas autenticadas a la API.
5. Probar primero un dispositivo y después ampliar hasta 20 vehículos.

La inmovilización remota queda fuera del MVP hasta evaluar controles de seguridad adicionales.
