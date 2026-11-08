# Servidor GPS Ecuador — despliegue para ~20 vehículos

## Estado
Esta carpeta contiene instrucciones de despliegue, **no** significa que exista ya un servidor activo. La página GitHub Pages actual es una demostración y NO debe recibir claves de Traccar.

## Requisitos
- VPS Ubuntu actualizado (punto de partida sugerido: 2 vCPU / 4 GB RAM; medir uso real)
- IP pública fija y dominio/subdominio controlado por el propietario
- Docker Engine + Docker Compose
- DNS A hacia el VPS, TLS HTTPS y copias de seguridad externas
- GPS 4G desbloqueados compatibles con Ecuador y con Traccar

## Instalación
Seguir la guía oficial https://www.traccar.org/install-vps/ y el ejemplo oficial MySQL de https://www.traccar.org/docker/ .
Instalar Traccar con MySQL persistente, no H2 para producción.
Usar https://www.traccar.org/secure-connection/ para configurar Caddy y HTTPS.
Configurar firewall: permitir SSH restringido, 80/443 para HTTPS, y **solo** los puertos TCP/UDP requeridos por los modelos GPS elegidos. Evitar exponer MySQL y el puerto HTTP interno 8082 a Internet.
No subir contraseñas, API keys, IMEI ni ubicaciones reales a GitHub.

## Integración con GPS Ecuador
La aplicación web está alojada en GitHub Pages (sitio público estático). No incorporar credenciales de administrador ni tokens permanentes en JavaScript público.
Opción inicial segura: usar el panel web de Traccar en un subdominio privado con HTTPS, cuentas y autenticación propia.
Para un panel personalizado, implementar un backend de acceso autenticado (BFF) que consulte la API Traccar en el servidor; nunca exponer credenciales de servicio en el frontend.
Prueba inicial: registrar un solo GPS con su identificador único, configurar APN/SIM y host:puerto del protocolo correcto, comprobar posición, historial y permisos.
Hacer pruebas de restauración de backups y supervisión antes de añadir los 19 restantes.

## Pendiente
1. Elegir proveedor VPS y crear cuenta/instancia (requiere intervención del titular y facturación).
2. Definir dominio/subdominio, IP y modelo exacto de GPS.
3. Desplegar, asegurar y probar.
4. Integrar panel personalizado y verificar 20 dispositivos.
