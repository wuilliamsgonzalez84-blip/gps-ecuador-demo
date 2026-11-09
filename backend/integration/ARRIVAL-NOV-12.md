# GPS Ecuador — preparación para FMC920 (12 de noviembre)

## Ya preparado
- Adaptador PostgreSQL para tablas existentes vehicles/positions.
- Rutas GET /api/vehicles y GET /api/positions, autenticadas y filtradas por IDs permitidos.
- Pruebas locales sin hardware: node backend/integration/test-gps-routes.cjs.
- Parche reversible para el Express existente: backend/integration/prepare-vultr-routes.cjs.
- No hay que reinstalar PostgreSQL ni reemplazar el receptor Teltonika.

## Activación segura en Vultr
El script de preparación debe ejecutarse desde el directorio que contiene server.js, db.js e integration/, después de revisar que los archivos descargados son los correctos. Guarda copia server.js.before-gps-routes y **deja las rutas DESACTIVADAS por defecto**. No reinicia servicios. No exponer GPS a Internet sin TLS, autenticación y control de acceso.

Para habilitar rutas hace falta, en la configuración privada del proceso Node:
- GPS_ROUTES_ENABLED=1
- GPS_API_KEY: secreto privado (no publicar, no incluir en Android)
- GPS_ALLOWED_ORIGIN: origen HTTPS exacto de un frontend confiable
- GPS_AUTHORIZED_VEHICLE_IDS: IDs reales de vehículos propios, separados por comas

El secreto en /root/gps-api-key NO está automáticamente disponible dentro de Docker. No poner secretos en GitHub ni en capturas. Hasta que exista una identidad autorizada de vehículo, mantener las rutas desactivadas.

## Cuando llegue el FMC920
1. Fotografiar etiqueta con modelo y bandas, ocultando IMEI/identificadores en capturas públicas.
2. Conseguir SIM con datos y cobertura LTE en Ecuador; confirmar APN y saldo/plan.
3. Alimentar dispositivo según manual y verificar LED/registro de red.
4. Configurar servidor de destino 45.77.197.18 y puerto TCP 5028, solo tras verificar firewall y conectividad segura; si el rastreador requiere protocolo particular, ajustar.
5. Registrar IMEI en devices vinculado al vehículo autorizado en vehicles; nunca inventar IDs.
6. Probar un paquete real del FMC920, confirmación de almacenamiento en positions y visualización desde API.
7. Probar alertas, historial y funcionamiento en movimiento; inmovilización remota queda fuera de esta fase y requiere evaluación de seguridad separada.

## Límites actuales
No está confirmada una URL de frontend definitiva ni un despliegue activo de estas rutas. No se ha validado tráfico real del FMC920. El script de preparación no prueba ni reinicia el servicio.
