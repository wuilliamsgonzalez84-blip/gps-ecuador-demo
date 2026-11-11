# GPS Ecuador — cuentas privadas (especificación aprobada)

## Política
- No hay registro público ni creación automática de cuentas.
- Solo el administrador autorizado crea, invita, suspende y revoca cuentas.
- Los usuarios ven exclusivamente vehículos asignados por el administrador.
- El administrador no debe conocer ni guardar contraseñas en texto claro; invitación de un solo uso con caducidad y establecimiento de contraseña por el usuario.
- Recuperación de acceso mediante enlace temporal de un solo uso; no revelar si existe un correo.
- Autenticación y autorización comprobadas en el servidor en **cada solicitud**, no solo en Android.
- Sesiones revocables; contraseñas con hash robusto (Argon2id), TLS, límites de intentos, auditoría sin datos de ubicación ni secretos.
- El rol administrador se provisiona por un procedimiento privado; nunca mediante registro abierto.
- Antes de producción, confirmar cómo funciona actualmente la autenticación y migrar sin romper usuarios ni datos existentes.

## Modelo objetivo
users(id, email único normalizado, password_hash, status, created_at)
roles y asignación de rol a usuarios (admin, customer)
vehicle_access(user_id, vehicle_id, granted_by, created_at)
account_invitations(token_hash, user_id, expires_at, used_at)
password_resets(token_hash, user_id, expires_at, used_at)
sessions(id, user_id, expires_at, revoked_at)

Aplicar claves foráneas, índices y restricciones. Evitar claves compartidas en la app.

## Eliminación de cuenta y datos
- Mostrar en la aplicación una vía clara para solicitar eliminación de cuenta y datos.
- Publicar también una página web accesible sin iniciar sesión que identifique GPS Ecuador y explique cómo solicitarla.
- Verificar identidad del solicitante sin pedir contraseñas.
- Definir y documentar categorías de datos eliminadas, retenidas, plazos y motivos legales o de seguridad de retención.
- Revocar sesiones y accesos a vehículos; tramitar eliminación según políticas de retención verificadas.
- No afirmar que existe borrado automático hasta implementarlo y probarlo.
- La declaración de Google Play debe reflejar el comportamiento real de la versión distribuida.

## Criterios de aceptación antes de desplegar
1. Registro público bloqueado.
2. Administrador invita a un usuario y le asigna un vehículo.
3. Usuario autorizado inicia sesión y ve solo sus vehículos.
4. Usuario no autorizado recibe 403, incluso si manipula ID en la API.
5. Suspensión revoca sesiones.
6. Recuperación de contraseña segura.
7. Solicitud de eliminación y su tratamiento verificados.
8. Auditoría de pruebas y copia de seguridad antes de migrar.

Estado: especificación, **no implementación ni despliegue**.
