# GPS Ecuador — control de publicación (2026-11-08)

## Verificado
- La rama de desarrollo tiene proyecto Android nativo.
- GitHub Actions "Compilar GPS Ecuador Android" completó correctamente en run 42456089579 y produjo el artefacto de pruebas `GPS-Ecuador-Android-debug`.
- Las pruebas automáticas del backend finalizaron correctamente en la misma revisión.

## Bloqueos externos — no simular como completados
1. **Play Console:** identidad del desarrollador en revisión; la verificación de teléfonos y creación de app aparecen bloqueadas en capturas del titular.
2. **Vultr:** no hay sesión autenticada disponible para comprobar servicios, esquema PostgreSQL, HTTPS o puertos. No desplegar a ciegas.
3. **FMC920:** hardware aún no recibido; se espera el 12 de noviembre. Faltan SIM/APN, IMEI y ensayo físico.
4. **Dominio:** la app Android usa `gps.example.invalid` como URL segura de marcador; la pantalla de flota no conecta hasta reemplazarlo por HTTPS real.
5. **Comercial:** organizaciones y roles son estructura inicial, no aislamiento completo ni facturación.
6. **Seguridad:** faltan autenticación de usuarios con sesiones, autorización por organización, gestión de secretos, pruebas de respaldo/restauración y revisión de privacidad.
7. **Play:** no hay AAB de lanzamiento firmado, ficha completa, capturas auténticas ni aprobación de Google.

## Próximos pasos técnicos sin acceso externo
- Verificar que el receptor rechace dispositivos deshabilitados y que no guarde duplicados.
- Diseñar endpoints con autorización por organización ANTES de ofrecer cuentas a clientes.
- Añadir telemetría de conexión y alertas reales basadas en datos disponibles del FMC920.
- Revisar y probar despliegue/rollback con copia de base de datos antes de producción.

## Paso humano imprescindible
Tras aprobación de identidad, el titular verifica los números mediante código SMS/llamada. No compartir códigos de verificación.
El titular debe autorizar la firma y publicación de la versión final después de revisar permisos, datos personales y costes.
