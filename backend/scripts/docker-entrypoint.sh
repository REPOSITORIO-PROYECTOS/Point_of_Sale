#!/bin/sh
set -e

DATA_DIR="${APP_DATA_DIR:-/data}"
DB_FILE="${SQLITE_DB_PATH:-$DATA_DIR/database.sqlite}"

mkdir -p "$DATA_DIR/uploads" "$DATA_DIR/branding" "$DATA_DIR/logs" "$DATA_DIR/afip" "$DATA_DIR/remote"

if [ ! -f "$DB_FILE" ]; then
  echo "Initializing SQLite at $DB_FILE ..."
  node dist/database/init-db.js
fi

exec "$@"
