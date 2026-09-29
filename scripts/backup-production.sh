#!/usr/bin/env bash
set -euo pipefail
cd /opt/estatehub
umask 077
backup_root=/opt/estatehub/backups
snapshot="$backup_root/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$snapshot/objects"
docker compose --env-file .env -f compose.production.yaml exec -T postgres pg_dump -U estatehub -d estatehub -Fc > "$snapshot/postgres.dump"
docker compose --env-file .env -f compose.production.yaml run --rm --no-deps \
  --volume "$snapshot/objects:/backup" app \
  node scripts/backup-objectstore.mjs /backup
docker exec -i estatehub-postgres-1 pg_restore --list < "$snapshot/postgres.dump" > /dev/null
find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime +6 -exec rm -rf -- {} +
echo "Backup verified: $snapshot"
