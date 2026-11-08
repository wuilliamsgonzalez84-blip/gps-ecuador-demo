# GPS Ecuador — plan de puesta en producción (20 vehículos)

Estado: preparación. El panel actual es demostrativo; no representa posiciones reales.

## 1. Infraestructura (bloqueada por Vultr)
- Resolver el problema de pantalla blanca al elegir Shared CPU; existe ticket de soporte enviado el 7 de noviembre de 2026.
- Antes de contratar: confirmar precio mensual, región, sistema operativo Ubuntu LTS, recursos, backups y política de facturación.
- Crear instancia con clave SSH **pública** existente; nunca subir la clave privada a GitHub.
- Confirmar IP y acceso SSH desde Termux. Desactivar autenticación por contraseña solo después de verificar acceso con clave.

## 2. Backend GPS
- Instalar Traccar según documentación oficial, con almacenamiento persistente.
- Configurar TLS/HTTPS, firewall y actualizaciones automáticas.
- Permitir solo puertos necesarios para el protocolo real del dispositivo.
- Mantener credenciales de administrador y claves en el servidor, fuera del repositorio.
- Configurar copias de seguridad y probar restauración.

## 3. Integración segura
- Crear API backend autenticada entre frontend y Traccar.
- Autorizar cada consulta por usuario, organización y vehículo.
- No exponer tokens de Traccar ni coordenadas privadas en GitHub Pages.
- Sustituir datos ficticios solo cuando la API funcione y esté protegida.

## 4. Prueba de campo
- Confirmar bandas LTE del rastreador para Ecuador y el operador SIM.
- Registrar IMEI/identificador del equipo de forma privada, sin publicarlo.
- Probar un vehículo propio o autorizado: ubicación, historial, pérdida de señal, reconexión y alertas.
- Escalar gradualmente a 20 vehículos tras verificar capacidad.

## 5. Preparación comercial futura
- Aislamiento multiempresa, roles, auditoría y gestión de usuarios.
- Política de privacidad, consentimiento, retención y eliminación de datos de ubicación.
- Planes, facturación, soporte y monitoreo antes de vender el servicio.

## Condiciones de aceptación del MVP
- 1 rastreador 4G físico entrega posiciones reales de manera confiable.
- Mapa e historial solo visibles para usuarios autorizados.
- Acceso HTTPS, backups restaurables y monitorización básica.
- Prueba de carga razonable para 20 vehículos.

Referencias:
- https://www.traccar.org/install-vps/
- https://www.traccar.org/quick-start/
