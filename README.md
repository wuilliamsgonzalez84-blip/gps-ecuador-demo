# GPS Ecuador

> **Actualización 8 de noviembre de 2026:** Se está construyendo una arquitectura propia **sin Traccar**. El repositorio conserva prototipos antiguos basados en Traccar y SQLite que **no deben considerarse el despliegue actual**. En Vultr, las capturas de terminal muestran un receptor Teltonika Node.js en `/opt/gps-ecuador-staging/backend/teltonika` con 8 pruebas automatizadas correctas; eso **no verifica todavía** la ingesta de posiciones reales, la conexión efectiva a PostgreSQL, la API pública ni el mapa. El panel `index.html` sigue siendo demostrativo. No migrar ni borrar bases de datos hasta comprobar su estado y realizar un respaldo.\n\nAplicación de demostración de rastreo vehicular. **Actualmente el panel principal usa datos ficticios y no rastrea vehículos reales.** No confundir los enlaces de prueba de teléfono con una plataforma de producción.

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

## Dirección de producto: servicio comercial futuro

La plataforma deberá ser **multiempresa (multi-tenant)**: cada cliente pertenece a una organización, y los vehículos, dispositivos, posiciones, alertas y suscripciones se vinculan a esa organización. El administrador general puede gestionar clientes, pero las consultas ordinarias deben aplicar autorización en el servidor y nunca confiar en filtros del navegador.

### Etapas

1. **MVP privado:** autenticación, 20 vehículos propios, un protocolo GPS 4G documentado, recepción de paquetes, mapa, historial, telemetría y copias de seguridad.
2. **Piloto comercial:** altas de organizaciones, roles administrador/cliente, separación estricta de datos, auditoría, límites por plan y alertas.
3. **Comercialización:** facturación con proveedor externo, contratos, consentimiento y políticas de privacidad, soporte, monitoreo, retención de datos y escalabilidad.

No implementar un receptor universal de protocolos sin especificaciones ni prometer compatibilidad con todos los GPS. No guardar contraseñas ni claves de dispositivos en el repositorio público. La función de inmovilización remota queda fuera del MVP hasta evaluar controles de seguridad específicos.
