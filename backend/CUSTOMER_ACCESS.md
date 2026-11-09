# Acceso privado de clientes — rama de pruebas

## Implementado en código (NO desplegado)
- Tablas de cuentas, asignación de vehículos y sesiones persistentes: migraciones 001 y 002.
- POST /api/login: correo + contraseña; cookie HttpOnly, Secure, SameSite=Strict con caducidad de 12 horas.
- POST /api/logout: revoca la sesión.
- GET /api/me: comprueba sesión.
- GET /api/vehicles y GET /api/positions: usan el account_id obtenido de la sesión y filtran por gps_account_vehicles.
- Se mantiene temporalmente el acceso servidor-a-servidor por APP_API_KEY, con DEVICE_ALLOWLIST. Nunca exponer esa clave en el navegador.
- Las cuentas admin también ven solo los vehículos asignados. La administración de clientes no está implementada.

## Pendiente antes de producción
1. Inspeccionar y respaldar el esquema real de PostgreSQL en Vultr. Confirmar public.vehicles(id) y public.positions.
2. Ejecutar las migraciones en una copia de pruebas; otorgar permisos mínimos para SELECT de cuentas/asignaciones y SELECT/INSERT/DELETE de sesiones.
3. Crear cuentas con un procedimiento privado y contraseña hash; nunca almacenar claves reales en GitHub.
4. Verificar Node.js y pruebas automatizadas de login, logout, sesiones caducadas, cuentas desactivadas, y aislamiento entre dos clientes.
5. Comprobar TLS y proxy HTTPS, cookies y ALLOWED_ORIGIN. El frontend debe estar en el mismo origen o adaptar el proxy; no se habilita CORS con credenciales aquí.
6. Sustituir limitación de intentos en memoria por mecanismo compartido y resistente a reinicios; revisar políticas de contraseñas y recuperación.
7. Implementar el formulario privado de acceso, panel real, alta/baja de clientes y auditoría.
8. Revisar seguridad de la clave de servicio existente y separar roles/permisos.
9. Fusionar y desplegar solamente después de pruebas y aprobación.

**Estado:** rutas conectadas en código, sin pruebas de integración con Vultr ni cuentas reales creadas.
