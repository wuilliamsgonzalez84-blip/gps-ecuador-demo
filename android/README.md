# GPS Ecuador Android (prototipo inicial)

Esta carpeta contiene el inicio de la aplicación nativa Android para compartir ubicación voluntariamente.

## Estado
Estructura de proyecto Android en desarrollo. **No es un APK listo para instalar ni está conectada aún al mapa remoto.**

## Objetivo
- Solicitar permiso de ubicación con explicación clara.
- Iniciar seguimiento únicamente tras acción explícita del usuario.
- Servicio en primer plano con notificación persistente y botón para detener.
- Conexión cifrada y autenticada a un backend propio (pendiente).
- Historial y revocación de acceso (pendientes).

La app no debe rastrear silenciosamente ni ocultar su actividad.

## Compilación
Abrir la carpeta `android` en Android Studio. Se requiere configurar Gradle y el SDK Android antes de compilar.
