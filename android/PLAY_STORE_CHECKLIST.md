# GPS Ecuador — Play Store checklist

**Estado:** proyecto Android nativo existente, aún sin versión Play publicada.

- [x] Prototipo local de ubicación voluntaria con servicio visible y opción de detener.
- [x] Pantalla separada para consultar la flota externa con WebView HTTPS.
- [x] Compilación automatizada de APK de prueba en GitHub Actions (verificar resultado).
- [ ] Identidad de desarrollador aprobada por Google y teléfonos verificados.
- [ ] Backend privado real desplegado con dominio HTTPS válido.
- [ ] Configurar FLEET_BASE_URL con ese dominio, probar login y permisos.
- [ ] Revisar permisos de ubicación/servicio en primer plano, avisos claros y comportamiento real.
- [ ] Política de privacidad pública, seguridad de datos, acceso para revisión y eliminación de datos.
- [ ] Ícono definitivo, capturas auténticas, ficha de tienda y datos de contacto.
- [ ] Firma de lanzamiento y AAB firmado, guardando claves fuera del repositorio.
- [ ] Pruebas cerradas o requisitos de publicación que Google indique para esta cuenta.
- [ ] Verificar aislamiento de clientes y no exponer coordenadas de terceros.

La función de compartir ubicación del teléfono **no** transmite datos al backend aún.
La pantalla de flota externa **no** puede operar hasta configurar el dominio HTTPS.
No declarar una publicación ni un AAB listo para Play hasta verificarlo.
