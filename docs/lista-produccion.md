# GPS Ecuador — Lista de verificación para salida a producción

## Antes de contratar VPS
- [ ] Resolver incidencia de pantalla blanca de Vultr (ticket creado; pendiente de respuesta).
- [ ] Confirmar presupuesto mensual, región, RAM, CPU, almacenamiento y backups.
- [ ] Confirmar que la clave SSH **pública** está asociada a la instancia; nunca compartir la privada.

## Backend y protección de datos
- [x] Prototipo de API de metadatos de dispositivos con lista permitida.
- [x] Pruebas iniciales de autorización, rutas y salud del servicio.
- [x] Flujo de CI para ejecutar comprobaciones de backend en GitHub.
- [ ] Ejecutar CI y corregir cualquier fallo detectado.
- [ ] Autenticación real de usuarios (no reutilizar APP_API_KEY en navegador).
- [ ] Permisos por organización y por vehículo, comprobados del lado del servidor.
- [ ] Límite de solicitudes, auditoría, gestión de sesiones y recuperación de cuentas.
- [ ] TLS/HTTPS y proxy inverso con configuración segura.
- [ ] Base de datos persistente, backups cifrados y prueba de restauración.

## Rastreador y pruebas
- [ ] Confirmar modelo exacto, bandas LTE, protocolo y SIM para Ecuador.
- [ ] Instalar Traccar, restringir puertos y conectar un equipo autorizado.
- [ ] Probar posición real, historial, pérdida de señal y reconexión.
- [ ] Verificar zona horaria, batería y precisión de ubicación.
- [ ] Probar escalamiento gradual hasta 20 vehículos.

## Futuro servicio comercial
- [ ] Aislamiento entre empresas, roles y panel de clientes.
- [ ] Política de privacidad y consentimiento para seguimiento.
- [ ] Alertas, suscripciones, facturación y soporte.
- [ ] Pruebas de seguridad antes de permitir usuarios externos.

**Importante:** El frontend público sigue siendo una demostración con datos ficticios. Ninguna de estas tareas pendientes debe presentarse como operativa.
