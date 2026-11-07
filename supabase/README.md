# Supabase para GPS Ecuador

Estado: esquema SQL preparado, **no desplegado**. El APK Android actual no envía ubicaciones remotas.

## Pasos para activar
1. Crear proyecto privado en https://supabase.com/dashboard
2. En SQL Editor, ejecutar `schema.sql`.
3. Habilitar autenticación de los dos usuarios y verificar sus identidades.
4. Implementar emparejamiento explícito y revocación de acceso en la app.
5. Conectar Android mediante URL de proyecto y clave **publicable** de Supabase, con sesión del propietario.
6. Conectar el mapa del observador con su propia sesión autenticada.
7. Verificar las políticas RLS con dos cuentas de prueba, incluida la revocación.
8. Establecer política de borrado de historial y límites de frecuencia antes de producción.

**Nunca subir la clave service_role, contraseñas, tokens privados o ubicaciones reales a GitHub.**

Este esquema hace que solo el propietario pueda insertar posiciones y que un observador autorizado pueda leerlas mientras sharing_enabled sea true. No es una solución terminada ni sustituye pruebas de seguridad.
