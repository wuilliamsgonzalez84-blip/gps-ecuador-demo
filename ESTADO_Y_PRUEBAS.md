# GPS Ecuador — comprobaciones verificadas al 15 de noviembre de 2026

> Esta sección es la referencia más reciente para evitar repetir tareas. La sección de abajo refleja el estado histórico del **7 de noviembre** y no debe interpretarse como el estado actual de todos los componentes. No se declara el sistema apto para producción sin pruebas físicas.

## Ya verificado en GitHub Actions el 14 de noviembre de 2026
- **APK Android:** compilación `Compilar GPS Ecuador Android` #54 terminó **success**. Confirmación de compilación, no de instalación en dos dispositivos. https://github.com/wuilliamsgonzalez84-blip/gps-ecuador-demo/actions/runs/43630800605
- **Prueba de rutas/permisos:** `GPS Ecuador - pruebas permisos clientes` #1 terminó **success**. https://github.com/wuilliamsgonzalez84-blip/gps-ecuador-demo/actions/runs/43629495300
- **Auditoría API real:** ejecución #1 **success**, verificando rechazo de solicitudes anónimas y tokens inválidos; ese flujo por sí solo **no** probó dos tokens válidos. https://github.com/wuilliamsgonzalez84-blip/gps-ecuador-demo/actions/runs/43630503305
- **Prueba cruzada de dos sesiones de clientes:** ejecución #1 **success**. El script usa sesiones temporales válidas, consulta los endpoints HTTP internos `/api/customer/vehicles`, `/api/customer/positions` y `/api/customer/history`, comprueba la ocultación de vehículos y posiciones de otro cliente y elimina las sesiones de prueba. **No equivale a dos teléfonos Android funcionando con cuentas reales.** https://github.com/wuilliamsgonzalez84-blip/gps-ecuador-demo/actions/runs/43630645471
- **Auditoría de BD de clientes:** ejecución #2 **success**. El resultado del workflow no debe interpretarse por sí solo como que ya se verificó toda la política de permisos en Android. https://github.com/wuilliamsgonzalez84-blip/gps-ecuador-demo/actions/runs/43630315394
- **SSH de solo lectura:** ejecución #1 **success**. https://github.com/wuilliamsgonzalez84-blip/gps-ecuador-demo/actions/runs/43629298687

## Pendiente de comprobación / integración
1. **Dos teléfonos Android físicos**: instalar la compilación actualizada, usar cuentas diferentes, verificar que el mapa e historial no muestren vehículos ajenos, y revisar cierre de sesión y comportamiento offline/online. No repetir pruebas de backend ya confirmadas.
2. **Teltonika FMC920**: llegada prevista para **20 de noviembre de 2026**. Después comprobar conexión del dispositivo real, configuración del receptor, protocolo AVL, inserciones en PostgreSQL y lectura de posiciones por API. No dar por hecho que el puerto o los servicios de Vultr están correctos sin verificación actual.
3. **Servicios de producción**: validar salud de la API accesible, HTTPS, copias de seguridad y alertas, sin cambiar configuración de Vultr que ya funciona.
4. **Google Play**: verificar participación efectiva de 12 probadores y el período requerido, estado real de la prueba cerrada y funcionamiento de la build instalada; no confundir un APK compilado con una versión subida/publicada.
5. **Supabase**: hubo aviso de posible pausa por inactividad con fecha 13 de noviembre. No afirmar que está pausado o activo sin consultar el panel actual. El prototipo Supabase de ubicación de teléfonos y el backend vehicular en Vultr son componentes distintos.

## Alcance y advertencias
- Plataforma GPS propia **sin Traccar**.
- Éxito de CI = éxito de las pruebas que ejecuta el workflow; no prueba completa de producción.
- No registrar secretos, tokens, IMEI real ni credenciales de clientes en este documento público.

---

## Estado histórico del 7 de noviembre de 2026 (conservar como referencia, no como lista vigente)

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
