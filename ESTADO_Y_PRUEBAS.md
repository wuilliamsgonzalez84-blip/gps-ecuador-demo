# GPS ECUADOR — estado y próximos pasos

## Estado comprobado (7 de noviembre de 2026)
- Supabase: proyecto GPS ECUADOR, ID `gbezbvhduwrqoyrugptb`.
- Tabla `public.location_points` creada con columnas `id`, `user_id`, `latitude`, `longitude`, `recorded_at`.
- RLS activado: cada usuario autenticado puede insertar, leer y borrar únicamente sus propias ubicaciones.
- `live.html`: comparte ubicación voluntariamente entre navegadores mediante PeerJS/WebRTC. Requiere mantener la página abierta; no persiste historial.
- `gps-phone.html`: prueba el GPS local, sin enviar datos a Supabase.
- `index.html`: panel de datos ficticios. No muestra vehículos reales.
- **La aplicación todavía NO está terminada ni realiza seguimiento en segundo plano.**

## Prueba de consentimiento y conexión
1. Publicar el repositorio por HTTPS (por ejemplo, GitHub Pages).
2. En el Android que compartirá su ubicación, abrir `live.html` y pulsar **Compartir ubicación desde este teléfono**.
3. Aceptar el permiso de ubicación del navegador.
4. Enviar el enlace privado generado únicamente al observador autorizado.
5. Abrir ese enlace en el segundo teléfono. Comprobar el mapa con ambos teléfonos y páginas abiertos.
6. Pulsar **Detener y cerrar sesión** en el teléfono emisor para terminar la sesión.

No compartir enlaces de sesión públicamente. El enlace actúa como credencial de acceso. Si se cierra la página, se bloquea la pantalla o Android suspende el navegador, el seguimiento puede detenerse.

## Pendiente para versión persistente
- Implementar autenticación Supabase para cada participante.
- Diseñar un mecanismo de consentimiento revocable y autorización específica de observadores; las políticas actuales **no permiten a otra cuenta leer la ubicación del emisor**.
- Conectar la escritura de coordenadas desde la cuenta del emisor y la lectura autorizada en el mapa del observador.
- Mostrar historial y permitir borrarlo.
- Para funcionamiento en segundo plano en Android, desarrollar una aplicación nativa con servicio de ubicación visible, notificación persistente y controles claros de pausa/detención. Una web/PWA por sí sola no garantiza rastreo continuo en segundo plano.
- Verificar permisos, seguridad y funcionamiento con dos teléfonos reales.

**Seguridad:** nunca incluir una clave `service_role` de Supabase en HTML, JavaScript público ni GitHub. Las claves públicas solo deben usarse con RLS correctamente configurado.
