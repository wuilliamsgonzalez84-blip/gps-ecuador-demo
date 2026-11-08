# GPS Ecuador — respaldo y recuperación
Este procedimiento es **preparación**, no evidencia de respaldo ejecutado.
Antes de ejecutarlo en Vultr, verificar el contenedor `gps-postgres`, espacio libre, permisos y credenciales internas de PostgreSQL.

## Respaldo
En el VPS, dentro del proyecto, ejecutar `bash backend/scripts/backup-postgres.sh`.
Por defecto escribe en `/opt/gps-ecuador/backups`, con permisos privados y retiene siete días. Variables opcionales:
- `GPS_POSTGRES_CONTAINER`: nombre del contenedor PostgreSQL.
- `GPS_BACKUP_DIR`: carpeta de respaldos.
- `GPS_BACKUP_KEEP_DAYS`: días de retención.

**Advertencia:** el script utiliza `pg_dump` dentro del contenedor. El respaldo local no protege contra la pérdida del VPS. Debe copiarse cifrado a un destino externo con acceso restringido y verificarse una restauración de prueba en una base de datos separada, nunca sobre producción.

## Restauración de prueba (no ejecutar sobre producción)
1. Preparar una base de datos temporal vacía con permisos limitados.
2. Ejecutar `pg_restore --list archivo.dump` y confirmar que las tablas esperadas están presentes.
3. Restaurar en la base temporal y comprobar recuentos, índices y relaciones.
4. Documentar fecha, tamaño, duración y resultado. Eliminar la base temporal cuando corresponda.

## Estado
Script guardado en GitHub. No se ha ejecutado en Vultr ni se ha validado una restauración.
