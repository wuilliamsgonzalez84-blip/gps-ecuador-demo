#!/usr/bin/env bash
# GPS Ecuador: backup PostgreSQL to a restricted local file.
# Run on the VPS after verifying the container name and available disk space.
set -Eeuo pipefail
umask 077
CONTAINER="${GPS_POSTGRES_CONTAINER:-gps-postgres}"
DEST="${GPS_BACKUP_DIR:-/opt/gps-ecuador/backups}"
KEEP_DAYS="${GPS_BACKUP_KEEP_DAYS:-7}"
[[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] || { echo "Invalid retention" >&2; exit 2; }
command -v docker >/dev/null || { echo "Docker is required" >&2; exit 2; }
docker inspect "$CONTAINER" >/dev/null
mkdir -p "$DEST"
[[ -d "$DEST" && ! -L "$DEST" ]] || { echo "Unsafe backup directory" >&2; exit 2; }
tmp="$(mktemp "$DEST/.gps-ecuador.XXXXXXXX.dump")"
trap 'rm -f "$tmp"' EXIT
# Database credentials remain inside the existing container; never echo them.
docker exec "$CONTAINER" sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$tmp"
[[ -s "$tmp" ]] || { echo "Empty backup" >&2; exit 1; }
if command -v pg_restore >/dev/null; then pg_restore --list "$tmp" >/dev/null; fi
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$DEST/gps-ecuador-$stamp.dump"
mv -n "$tmp" "$final"
trap - EXIT
find "$DEST" -maxdepth 1 -type f -name 'gps-ecuador-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "Backup created: $final"
echo "IMPORTANT: verify a restore and copy encrypted backups off the VPS."
