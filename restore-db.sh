#!/bin/bash
# ================================================================
# MikroKrédito MZ — Restaurar base de dados
# Execute: bash restore-db.sh microcredit_local.backup
# ================================================================
BACKUP_FILE="${1:-microcredit_local.backup}"
DB_NAME="${DB_NAME:-microcredito}"
DB_USER="${DB_USER:-postgres}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Ficheiro de backup não encontrado: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  Isto irá substituir a base de dados '$DB_NAME' com o backup."
read -p "Continuar? (s/N): " confirm
[ "$confirm" != "s" ] && [ "$confirm" != "S" ] && echo "Cancelado." && exit 0

echo "🗄️  A criar base de dados (se não existir)..."
psql -U "$DB_USER" -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || true

echo "📥 A restaurar backup..."
pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  --clean --if-exists "$BACKUP_FILE" 2>&1 | grep -v "^pg_restore:" || true

echo "✅ Base de dados restaurada com sucesso!"
echo "   Já não precisa de correr 'npm run seed'"
