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

## Integración con la app Android ya probada (vehículo 1)

La app ha recuperado 21 posiciones del vehículo 1 y dibuja el historial; esto valida la consulta de datos existentes, **no** la recepción del FMC920. No cambiar la API Android, el esquema de PostgreSQL ni reinstalar la app para esta etapa.

### Puerta de verificación antes de conectar hardware
1. Comprobar que el servicio receptor Teltonika que ya existe sigue activo y escuchando en TCP 5028, sin crear otro servicio ni duplicar puertos.
2. Confirmar con una consulta de solo lectura qué tablas guardan dispositivos/IMEI y cómo se relacionan con `vehicles.id`; no asumir columnas ni registrar un IMEI ficticio.
3. Verificar que la ruta autenticada utilizada por Android consulta `positions.vehicle_id=1`, y conservar el acceso privado actual.
4. Mantener separado el rastreo del teléfono del dispositivo físico durante la prueba; no asociar automáticamente el FMC920 al vehículo 1 sin confirmar que ese será su destino.
5. Revisar si el receptor verifica el IMEI autorizado y si decodifica el protocolo Teltonika Codec 8/8E utilizado por el equipo; no aceptar paquetes desconocidos como posiciones válidas.

### Prueba de aceptación cuando llegue el equipo
1. Confirmar modelo, firmware, bandas y SIM/APN. Configurar destino IP/puerto TCP según la red donde se utilizará.
2. Desde un entorno seguro, observar un inicio de sesión del IMEI y una trama AVL real en los registros del receptor, sin publicar el IMEI ni secretos.
3. Confirmar ACK del receptor, fecha UTC, coordenadas y registro único en PostgreSQL. Comprobar que no se duplican posiciones por retransmisión.
4. Asociar el dispositivo al vehículo autorizado tras validar la identidad; verificar que el historial privado Android muestra una posición nueva con la fecha correcta.
5. Hacer una prueba estacionaria y otra de desplazamiento corto. Comparar coordenadas y horas reales; revisar que los filtros del mapa no conecten saltos imposibles.
6. Probar desconexión/reconexión de datos móviles y recuperación del historial. No probar inmovilización remota durante esta fase.

### Criterio de finalización
Integración terminada solo cuando exista una trama real del FMC920 recibida por el receptor, almacenada en PostgreSQL, asociada a un vehículo autorizado y consultable en Android. GitHub Actions y el historial del teléfono por sí solos no demuestran este flujo.
