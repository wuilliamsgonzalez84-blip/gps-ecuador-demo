# GPS Ecuador: procedimiento de despliegue (pendiente de ejecutar)

## 1. Preparar infraestructura
- Crear VPS Ubuntu LTS con SSH por clave pública; deshabilitar autenticación SSH por contraseña tras comprobar acceso.
- Activar actualizaciones de seguridad, firewall y copias de seguridad.
- Usar dominio propio, DNS y HTTPS (por ejemplo, proxy inverso Caddy).
- Exponer solo 443/80 y los puertos del protocolo GPS necesarios para el dispositivo; nunca publicar la base de datos o el puerto interno del backend.
- Confirmar qué puerto y protocolo usa el Teltonika FMC920 antes de abrir puertos.

## 2. Instalar servicios
- Traccar estable con base de datos persistente y credenciales restringidas.
- API Node.js de GPS Ecuador bajo usuario de sistema sin privilegios.
- PostgreSQL para organizaciones, usuarios y configuración; revisar schema.sql, políticas de aislamiento y migraciones.
- Autenticación gestionada con validación de sesiones del lado del servidor; no usar la clave interna de API en el navegador.

## 3. Pruebas antes de publicar
- Ejecutar npm run check y npm test.
- Probar un GPS propio con consentimiento y verificar posiciones reales, pérdida de señal, historial y alertas.
- Probar que dos organizaciones no pueden ver vehículos ajenos.
- Hacer pruebas de carga hasta 20 dispositivos, restauración de backups y rotación de credenciales.
- Revisar privacidad, términos, retención y protección de datos antes de comercializar.

## 4. Dependencias externas
La cuenta Vultr sigue bloqueada en la creación del VPS; se requiere resolverlo o elegir otro proveedor. El rastreador físico todavía no ha llegado. No afirmar que existe servicio en producción hasta superar todas las pruebas.
