#!/usr/bin/env bash
# Read-only preflight for the GPS Ecuador VPS. Does not expose passwords.
set -u
failed=0
check(){ if "$@" >/dev/null 2>&1; then printf 'OK: %s\n' "$1"; else printf 'REVISAR: %s\n' "$1"; failed=1; fi; }
echo 'GPS Ecuador — verificación previa (sin cambios)'
check docker docker info
if docker inspect -f '{{.State.Running}}' gps-postgres 2>/dev/null | grep -qx true; then echo 'OK: gps-postgres activo'; else echo 'REVISAR: gps-postgres no está activo'; failed=1; fi
if docker inspect -f '{{.State.Running}}' gps-postgres 2>/dev/null | grep -qx true; then
 if docker exec gps-postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then echo 'OK: PostgreSQL responde'; else echo 'REVISAR: PostgreSQL no responde'; failed=1; fi
fi
if [[ -f /opt/gps-ecuador/.env ]]; then echo 'OK: archivo de entorno presente (contenido no mostrado)'; else echo 'REVISAR: falta /opt/gps-ecuador/.env'; failed=1; fi
if command -v df >/dev/null; then df -h /opt 2>/dev/null || true; fi
echo 'Pendiente: comprobar TLS, firewall, copia restaurable, SIM/APN, IMEI y conexión FMC920.'
exit "$failed"
