# Servidor GPS Ecuador — backend propio (sin Traccar)

**Estado:** código inicial añadido; no está desplegado ni probado en un servidor público. No recibe todavía protocolos TCP/UDP de rastreadores 4G.

## Funciones ya programadas

- Organizaciones y usuarios con roles propietario/lector.
- Sesiones con token aleatorio y contraseña derivada con scrypt.
- Vehículos separados por organización.
- Ingesta de coordenadas por HTTP autenticada con clave de dispositivo (solo para clientes propios o pruebas autorizadas).
- Consulta de posiciones recientes por vehículo y almacenamiento SQLite.

## Ejecutar localmente

1. Instala Node.js 20+ y ejecuta `npm install` en esta carpeta.
2. Ejecuta `npm start` una vez para inicializar la base de datos y detén el servidor.
3. Ejecuta `node bootstrap.js "Mi empresa" "correo@ejemplo.com" "contraseña-de-14-caracteres-o-más"`. Evita usar una contraseña real en una terminal que guarde historial; este método es provisional.
4. Ejecuta `npm start`. Escucha únicamente en `127.0.0.1:3000`.

## API inicial

- `POST /api/login`: `{email,password}`; devuelve token temporal.
- `POST /api/logout`: cierra sesión.
- `GET /api/vehicles`: lista vehículos de la organización autenticada.
- `POST /api/vehicles`: `{name}`; devuelve clave de dispositivo **una sola vez**.
- `GET /api/vehicles/:id/positions`: últimas 500 posiciones del vehículo autorizado.
- `POST /api/ingest`: cabecera `Authorization: Device <clave>`, JSON `{lat,lon,speed,recordedAt}`, tiempo en milisegundos Unix.

## Antes de publicar o vender

Necesita HTTPS, proxy inverso, firewall, pruebas de seguridad, backups y restauración, recuperación de contraseñas, rotación de claves, monitoreo, política de retención, consentimiento y protección de datos. Para mayor escala, evaluar PostgreSQL, migraciones y límites por cliente. No poner tokens ni coordenadas privadas en GitHub Pages. El receptor de rastreadores GPS 4G reales depende del modelo y protocolo elegido.
