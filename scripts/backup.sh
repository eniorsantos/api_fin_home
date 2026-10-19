#!/bin/bash
# Database backup script for PostgreSQL
# Usage: ./backup.sh [retention_days]

set -e

RETENTION_DAYS=${1:-7}
BACKUP_DIR=${BACKUP_DIR:-"/backups"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"finance"}
DB_USER=${DB_USER:-"finance"}
DB_PASSWORD=${DB_PASSWORD:-"finance"}

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
LATEST_LINK="${BACKUP_DIR}/${DB_NAME}_latest.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Iniciando backup do banco ${DB_NAME} em ${BACKUP_FILE}"

export PGPASSWORD="${DB_PASSWORD}"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --no-password --verbose --clean --if-exists --create | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
  echo "Backup concluído com sucesso: ${BACKUP_FILE}"
  ls -lh "${BACKUP_FILE}"

  # Create/update latest symlink
  ln -sf "$(basename "${BACKUP_FILE}")" "${LATEST_LINK}"

  # Remove old backups
  echo "Removendo backups com mais de ${RETENTION_DAYS} dias..."
  find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

  echo "Backup finalizado."
else
  echo "Erro ao realizar backup!"
  exit 1
fi