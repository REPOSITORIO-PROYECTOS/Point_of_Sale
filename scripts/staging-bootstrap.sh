#!/usr/bin/env bash
# Verificación post-deploy del stack staging (Linux / macOS / Git Bash).
# Uso desde la raíz del repo:
#   cp deploy/staging/.env.example deploy/staging/.env   # editar dominios
#   bash scripts/staging-bootstrap.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/staging/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

LOCAL_A_HOST="${STAGING_LOCAL_A_HOST:-local-a.tu-dominio.com}"
LOCAL_B_HOST="${STAGING_LOCAL_B_HOST:-local-b.tu-dominio.com}"
BASE_URL_A="${STAGING_BASE_URL_A:-https://${LOCAL_A_HOST}}"
BASE_URL_B="${STAGING_BASE_URL_B:-https://${LOCAL_B_HOST}}"
NGINX_LOCAL="${STAGING_NGINX_URL:-http://127.0.0.1:8080}"

pass() { printf '  [OK] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; }
info() { printf '  [--] %s\n' "$1"; }

check_http() {
  local label="$1"
  local url="$2"
  local host_header="${3:-}"

  if [[ -n "$host_header" ]]; then
    if curl -fsS -o /dev/null -H "Host: ${host_header}" "$url"; then
      pass "$label ($url, Host: $host_header)"
      return 0
    fi
  elif curl -fsS -o /dev/null "$url"; then
    pass "$label ($url)"
    return 0
  fi

  fail "$label ($url)"
  return 1
}

echo "=== Staging POS — health checks ==="
echo

FAILED=0

info "Contenedores Docker"
if docker compose -f "${ROOT_DIR}/docker-compose.staging.yml" ps --status running 2>/dev/null | grep -qE 'pos-api-local-a|web'; then
  pass "docker compose staging tiene servicios en ejecución"
else
  fail "levantá el stack: docker compose -f docker-compose.staging.yml --env-file deploy/staging/.env up -d --build"
  FAILED=1
fi

echo
info "API interna vía nginx (Host header, sin TLS)"
check_http "Local A API" "${NGINX_LOCAL}/api" "$LOCAL_A_HOST" || FAILED=1
check_http "Local B API" "${NGINX_LOCAL}/api" "$LOCAL_B_HOST" || FAILED=1

echo
info "Endpoints públicos (TLS vía Caddy en el host)"
if [[ "$BASE_URL_A" != https://local-a.tu-dominio.com ]]; then
  check_http "Local A público" "${BASE_URL_A}/api" || FAILED=1
else
  info "Omitido Local A público — configurá STAGING_LOCAL_A_HOST en deploy/staging/.env"
fi

if [[ "$BASE_URL_B" != https://local-b.tu-dominio.com ]]; then
  check_http "Local B público" "${BASE_URL_B}/api" || FAILED=1
else
  info "Omitido Local B público — configurá STAGING_LOCAL_B_HOST en deploy/staging/.env"
fi

echo
echo "=== Checklist bootstrap por local ==="
echo
cat <<EOF
Local A (${LOCAL_A_HOST}):
  1. Abrir ${BASE_URL_A} en el navegador del mostrador
  2. Configuración inicial → crear administrador (ej. admin.centro)
  3. Login admin → Usuarios → crear cajero (ej. cajero.centro, rol Cajero)
  4. Login cajero → Caja → abrir sesión → venta de prueba

Local B (${LOCAL_B_HOST}):
  1. Abrir ${BASE_URL_B}
  2. Configuración inicial → admin.norte
  3. Crear cajero.norte
  4. Venta de prueba

Aislamiento:
  - Las ventas del Local A NO deben verse en el Local B (SQLite separados)

AFIP (opcional):
  - Sin certificados: ventas y caja funcionan; facturación AFIP fallará
  - Homologación: montar user.crt/user.key en volumen /data/afip de cada API

EOF

if [[ "$FAILED" -ne 0 ]]; then
  echo "Algunos checks fallaron. Revisá docs/casos-de-uso/07-despliegue-linux-staging.md"
  exit 1
fi

echo "Checks básicos OK."
