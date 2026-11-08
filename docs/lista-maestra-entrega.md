# Lista maestra de entrega — GPS Ecuador independiente

Este documento es la fuente única de seguimiento. Una casilla no marcada significa que no está verificada en producción.

## Receptor y datos
- [x] Código inicial de Codec 8 / Codec 8E, IMEI, CRC y TCP
- [x] Esquema PostgreSQL para dispositivos y posiciones
- [x] Persistencia transaccional y ACK tras COMMIT
- [ ] Ejecutar pruebas de integración contra PostgreSQL real
- [ ] Probar fragmentación, concatenación, pérdida de red, reintentos y duplicados
- [ ] Verificar tramas oficiales y FMC920 real
- [ ] Fortalecer el aprovisionamiento de IMEI y la protección contra suplantación
- [ ] Desplegar receptor seguro, límites de conexiones, métricas y registros
- [ ] Política de retención y copias de seguridad restaurables

## Producto y usuarios
- [ ] Autenticación y recuperación de cuentas
- [ ] Permisos por organización y dispositivo en API y canal de tiempo real
- [ ] API propia de vehículos, posiciones e historial
- [ ] Mapa en vivo, búsqueda, filtros y reproducción de rutas
- [x] Biblioteca inicial de geocercas, transiciones, resumen y CSV
- [ ] Integrar geocercas e informes con datos persistidos
- [ ] Alertas configurables y notificaciones reales
- [ ] Conductores, grupos, mantenimiento, vencimientos y sensores compatibles
- [ ] Panel comercial, suscripciones, facturas y pagos
- [ ] Idioma español, zona horaria Ecuador, accesibilidad y móvil

## Operación y lanzamiento
- [ ] Servidor VPS activo, DNS, HTTPS y base de datos desplegada
- [ ] Pruebas de carga con 20 vehículos
- [ ] Seguridad, auditoría, consentimiento, privacidad y eliminación de datos
- [ ] Monitoreo, recuperación de fallos y restauración de respaldo
- [ ] Prueba física con FMC920 y SIM de datos
- [ ] Revisión de licencias y documentación de operación
- [ ] Pruebas de extremo a extremo y publicación comercial

## Advertencia
El antiguo backend/server.js aún usa Traccar. No es el backend final.
Los módulos nativos recién incorporados no están validados en un servidor real y no se debe afirmar que el servicio esté listo para clientes.
