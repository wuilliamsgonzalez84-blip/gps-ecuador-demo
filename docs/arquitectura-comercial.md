# GPS Ecuador — arquitectura comercial propuesta

**Estado:** diseño y código inicial, no servicio desplegado.

## Componentes
1. Traccar recibe datos de rastreadores autorizados.
2. Backend privado consulta Traccar y aplica permisos por organización y vehículo.
3. Base de datos futura guarda organizaciones, usuarios, vehículos, suscripciones y auditoría.
4. Frontend autenticado muestra posiciones, recorridos y alertas.
5. Procesador de pagos externo administra cobros; nunca almacenar tarjetas en nuestra base de datos.

## Tablas propuestas
- organizations: id, name, status
- users: id, organization_id, email, role, active
- user_vehicle_access: user_id, vehicle_id
- vehicles: id, organization_id, traccar_device_id, name, active
- subscriptions: id, organization_id, plan_id, billing_status
- alert_rules: id, vehicle_id, type, threshold, enabled
- alert_events: id, vehicle_id, type, occurred_at, delivered_at
- audit_events: id, actor_user_id, organization_id, action, occurred_at

## Principios obligatorios
- Verificar identidad y permisos en cada consulta.
- Nunca confiar en organization_id enviado por el navegador.
- Mantener tokens de Traccar exclusivamente en el servidor.
- Cifrar conexiones, limitar consultas y aplicar retención de datos.
- Probar aislamiento entre clientes antes de aceptar cuentas comerciales.
- La inmovilización remota permanece deshabilitada hasta evaluación técnica y de seguridad.

## Próximas integraciones
Autenticación persistente, base de datos, proveedor de notificaciones, pagos, historial de Traccar y geocercas. Los módulos de alertas y permisos agregados son lógica preparatoria, no una API de producción.
