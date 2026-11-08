# GPS Ecuador — orden de despliegue seguro en Vultr

**Estado:** guía preparada; no se ha accedido al VPS ni desplegado el código de esta rama.

## 1. Inspección de solo lectura
En el VPS ejecutar `bash backend/scripts/preflight-vps.sh` y revisar:
- Docker y contenedor `gps-postgres` activos.
- `pg_isready` correcto; espacio libre suficiente.
- Esquema real de `vehicles`, `devices` y `positions`; comparar con `migrations/001_initial.sql`.
- Contenedores y puertos ya ocupados. No sobrescribir `gps-api` ni `gps-postgres` existentes.

## 2. Copia antes de cambios
Ejecutar `bash backend/scripts/backup-postgres.sh` tras revisar el script, copiar el archivo cifrado fuera del VPS y probar restauración en base temporal. **No migrar sin respaldo comprobado.**

## 3. Pruebas locales
Desde `backend/`: `npm install --ignore-scripts --no-audit --no-fund`, `npm test`, `npm run check`.
`docker compose -f compose.yaml config` necesita un `.env` válido; nunca guardar credenciales en Git.

## 4. Publicación privada
Instalar la versión de `develop/gps-backend-no-traccar` en contenedores separados, sin publicar 3000 ni 5027 al principio. Verificar:
- `/api/health`: API disponible; no garantiza PostgreSQL.
- `/api/ready`: autenticado y consulta PostgreSQL.
- `/api/positions/latest`, `/api/alerts`, `/api/fleet/status`: requieren autenticación.
- `/panel`: requiere autenticación; rutas de 24 horas y alertas visibles.
- Probar con datos de desarrollo aislados, no insertar ubicaciones simuladas en producción.

## 5. Acceso público y GPS real
Configurar DNS, HTTPS con certificado válido, proxy inverso y firewall; no exponer credenciales HTTP Basic por HTTP.
Verificar puerto TCP de recepción y controles de abuso antes de permitir conexiones de dispositivos externos. La apertura del puerto se hará únicamente tras comprobar recepción, registros y base de datos.
Con el FMC920: registrar IMEI autorizado, SIM/APN, servidor y puerto; comprobar paquetes Codec 8/8E, ACK, ubicación y reconexión.

## 6. Antes de vender
Separar clientes y vehículos por organización; permisos por usuario, auditoría, consentimiento y políticas de retención. El acceso Basic actual **no sirve para múltiples clientes**.

## Bloqueo actual
Sin sesión SSH o acceso de administración al VPS no se puede verificar ni instalar allí desde GitHub. No interpretar pruebas de CI como una instalación real.
