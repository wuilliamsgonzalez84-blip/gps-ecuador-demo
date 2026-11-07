# GPS Ecuador — plan para rastreo remoto autorizado

## Ya implementado
- Prototipo Android con servicio de ubicación en primer plano y notificación visible.
- Inicio por acción del usuario y botón de detención.
- Compilación de APK debug con GitHub Actions.
- Demo web de conexión directa entre navegadores (no apta para seguimiento persistente).

## Pendiente para seguimiento real Ecuador → Miami
1. Backend HTTPS con autenticación individual y reglas de acceso por dispositivo.
2. Registro y emparejamiento voluntario: propietario del Android acepta invitación y puede revocarla.
3. Envío autenticado de coordenadas desde servicio de ubicación en primer plano, con reintentos controlados.
4. Mapa web protegido con sesión; no exponer ubicaciones en GitHub Pages ni en enlaces públicos.
5. Política de retención breve, opción de borrar historial, límites de tasa y auditoría de accesos.
6. Pruebas con permisos, pantalla bloqueada, ahorro de batería, desconexión de red y detención.

## Decisiones de privacidad y seguridad
- No usar rastreo oculto. La notificación de Android debe permanecer visible mientras se rastrea.
- No almacenar contraseñas, tokens, claves API privilegiadas ni coordenadas privadas en el repositorio público.
- No se transmiten ubicaciones en el APK inicial; su funcionamiento local no prueba el seguimiento remoto.
- Android puede suspender el servicio por batería, permisos o restricciones del fabricante; no prometer disponibilidad absoluta.
- El usuario debe consentir explícitamente y poder detener y revocar el acceso en cualquier momento.

## Próximo requisito
Seleccionar y configurar backend privado (p. ej. Supabase) con proyecto propio, credenciales públicas de cliente y reglas RLS verificadas antes de habilitar cualquier transmisión.
