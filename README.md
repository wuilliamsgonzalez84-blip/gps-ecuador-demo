# GPS Ecuador — plataforma propia sin Traccar

Proyecto de rastreo GPS para vehículos autorizados. **Estado: desarrollo y pruebas; no está listo para uso comercial.**

## Lo que está comprobado
- En el servidor Vultr se configuró un receptor Teltonika Node.js escuchando en TCP 5028, como servicio systemd persistente. Se observaron 8 pruebas automatizadas aprobadas.
- Esas pruebas **no demuestran todavía** que un GPS físico transmita posiciones ni que se guarden en PostgreSQL.
- El repositorio contiene un panel web demostrativo (`index.html`), una prueba de ubicación compartida entre navegadores (`live.html`) y un prototipo Android que guarda ubicaciones localmente.

## Arquitectura elegida

Teltonika 4G (TCP/Codec 8/8E) → receptor Node.js propio en Vultr → PostgreSQL → API HTTPS autenticada → panel web y app Android.

La ingesta Teltonika desplegada está actualmente en `/opt/gps-ecuador-staging/backend/teltonika`. **Antes de moverla o modificarla hay que recuperar su versión exacta, revisar dependencias y hacer respaldo.** No asumir que los prototipos del repositorio coinciden con el servidor.

## Prototipos anteriores: no desplegar en producción
- `backend/`: proxy de API **dependiente de Traccar**; código histórico, no forma parte de la arquitectura elegida.
- `server/`: prototipo de API con SQLite; **no está integrado** con PostgreSQL ni con el receptor Teltonika.
- `supabase/`: experimento separado de ubicación compartida; no constituye el almacenamiento principal de vehículos.
- `index.html`: datos y alertas ficticios, sin mapa conectado a vehículos.
- `live.html`: demostración de compartir ubicación voluntariamente entre navegadores; no sirve como rastreo permanente de vehículos.

Conservar estos archivos por ahora para no perder trabajo. **No desplegarlos ni borrarlos** hasta tener migración comprobada y respaldos.

## Próximos hitos, en orden
1. Inspeccionar la configuración del servidor **sin imprimir secretos ni modificar datos**; script `scripts/diagnostico-vultr.sh` en la rama de integración.
2. Comprobar que el receptor autoriza IMEI conocidos y puede insertar y leer posiciones de prueba en PostgreSQL, sin afectar vehículos reales.
3. Crear una API HTTPS de solo lectura con autenticación, aislamiento por organización y permisos por vehículo; integrar con el esquema PostgreSQL **real**, no uno supuesto.
4. Conectar el panel a esa API; mostrar estado sin señal cuando no haya datos, historial y última actualización; eliminar datos ficticios de la vista de producción.
5. Probar en un dispositivo real, incluido reconexión y precisión; luego probar carga progresiva hasta 20 vehículos.
6. Revisar seguridad (HTTPS, secretos, backups/restauración, límites, logs), Android y requisitos de Google Play antes de publicar.

## Seguridad
- No publicar credenciales, contraseñas, claves privadas, cadenas de conexión ni IMEI en GitHub o capturas.
- El receptor GPS solo acepta dispositivos previamente autorizados.
- Nunca exponer PostgreSQL directamente a Internet ni poner una clave administrativa de API en JavaScript público.
- Probar restauración de backups antes de migrar o cambiar esquemas.

## Estado de Play Store
La app Android del repositorio **no envía posiciones al servidor**. Ver `GOOGLE_PLAY_PREPARACION.md`; no afirmar que existe una publicación aprobada sin verificar Play Console.
