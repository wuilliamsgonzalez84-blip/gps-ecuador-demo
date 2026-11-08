# GPS Ecuador

Aplicación de demostración de rastreo vehicular. **Actualmente el panel principal usa datos ficticios y no rastrea vehículos reales.** No confundir los enlaces de prueba de teléfono con una plataforma de producción.

## Objetivo

Plataforma privada para administrar inicialmente hasta 20 vehículos propios, con rastreadores GPS 4G autorizados y conexión a un servidor de rastreo.

## Arquitectura propuesta (pendiente de implementar)

- **Frontend:** sitio de este repositorio, actualmente demostrativo.
- **Backend GPS:** Traccar autohospedado en un VPS Linux, con base de datos persistente y copias de seguridad.
- **Acceso:** HTTPS, usuarios autenticados y autorización por vehículo; no publicar coordenadas, claves ni identificadores en GitHub Pages.
- **Dispositivos:** modelos GPS 4G compatibles con protocolos de Traccar, SIM con datos y cobertura en el país donde operen.
- **Integración:** backend propio que consulte la API de Traccar y entregue únicamente los vehículos autorizados al frontend; nunca exponer credenciales administrativas de Traccar en JavaScript público.

## Pendientes antes de operar

1. Aprobar el precio del VPS y desplegarlo en Vultr u otro proveedor.
2. Instalar Traccar y una base de datos adecuada para producción (MySQL o TimescaleDB), HTTPS, firewall, copias de seguridad y actualizaciones.
3. Configurar usuarios, acceso privado y recuperación de cuenta.
4. Elegir un modelo concreto de rastreador 4G; abrir únicamente el puerto TCP/UDP requerido por su protocolo.
5. Crear el servicio seguro de integración con Traccar y sustituir los datos ficticios del panel.
6. Probar primero un vehículo con consentimiento, luego ampliar hasta 20 y comprobar capacidad real.
7. Definir retención de historial, permisos, alertas y tratamiento de datos de ubicación.

## Referencias oficiales

- [Instalación Traccar en VPS](https://www.traccar.org/install-vps/)
- [Docker Traccar](https://www.traccar.org/docker/)
- [Guía de inicio Traccar](https://www.traccar.org/quick-start/)

**Estado:** planificación técnica; ningún servidor está desplegado desde este repositorio y no se ha conectado ningún rastreador físico.
