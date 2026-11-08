#!/usr/bin/env bash
# Diagnóstico no destructivo de GPS Ecuador en Vultr. No imprime credenciales.
set -u
ROOT="${GPS_ROOT:-/opt/gps-ecuador-staging/backend/teltonika}"
SERVICE="${GPS_SERVICE:-gps-teltonika.service}"
ok() { printf 'OK: %s\n' "$1"; }
warn() { printf 'REVISAR: %s\n' "$1"; }
echo "=== GPS Ecuador: diagnóstico de solo lectura ==="
if [ -d "$ROOT" ]; then ok "Directorio del receptor presente"; else warn "No existe $ROOT"; fi
for file in receiver.js codec.js api.js app.js migration.sql .env; do
  if [ -f "$ROOT/$file" ]; then ok "Existe $file"; else warn "Falta $file"; fi
done
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet "$SERVICE"; then ok "Servicio $SERVICE activo"; else warn "Servicio $SERVICE inactivo o no encontrado"; fi
  systemctl --no-pager --plain show "$SERVICE" -p LoadState -p ActiveState -p SubState -p ExecMainStatus 2>/dev/null || true
fi
if command -v ss >/dev/null 2>&1; then
  if ss -lnt | grep -Eq '[:.]5028[[:space:]]'; then ok "Puerto TCP 5028 en escucha"; else warn "Puerto TCP 5028 no está en escucha"; fi
fi
if command -v node >/dev/null 2>&1 && [ -d "$ROOT" ]; then
  for file in receiver.js codec.js api.js app.js; do
    if [ -f "$ROOT/$file" ]; then
      if node --check "$ROOT/$file" >/dev/null 2>&1; then ok "Sintaxis correcta: $file"; else warn "Error de sintaxis: $file"; fi
    fi
  done
  if [ -f "$ROOT/codec.test.js" ] && [ -f "$ROOT/receiver.test.js" ]; then
    (cd "$ROOT" && node --test codec.test.js receiver.test.js) || warn "Fallaron pruebas automatizadas"
  fi
fi
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -q; then ok "PostgreSQL responde en configuración local por defecto"; else warn "PostgreSQL no responde en configuración local por defecto (puede usar Docker/otro puerto)"; fi
fi
echo "Diagnóstico terminado. No se han cambiado archivos, servicios ni datos."
