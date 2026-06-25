# Caso 07 — Despliegue provisional POS web en Linux (2 locales)

**Objetivo:** Montar en un VPS Linux dos cajas web independientes (Local A y Local B), cada una con su propia API y base SQLite, accesibles por subdominio.

## Resumen

| Componente | Rol |
|------------|-----|
| `pos-api-local-a` / `pos-api-local-b` | API NestJS + SQLite aislado por local |
| `web` (nginx) | UI estática + proxy `/api` según `Host` |
| `afip` | Microservicio fiscal homologación (opcional) |
| Caddy en el host | TLS (`https://`) → nginx `:8080` |

**No es producción de mostrador:** el `.exe` Windows sigue siendo el camino offline-first. Este staging valida UI + API en navegador.

## Requisitos

- VPS Linux (Ubuntu 22.04+ recomendado)
- Docker + Docker Compose v2
- Node 20+ en la máquina de build (o en el VPS)
- DNS: registros `A`/`AAAA` para `local-a.tu-dominio.com` y `local-b.tu-dominio.com`
- Caddy o nginx en el host para TLS (ver [`deploy/staging/Caddyfile.example`](../../deploy/staging/Caddyfile.example))

## 1. Preparar el servidor

```bash
# Clonar o copiar el repo en el VPS
cd /opt/Point_of_Sale   # ruta de ejemplo

# Dependencias Node (build frontend)
npm install
npm install --prefix frontend

# Variables de staging
cp deploy/staging/.env.example deploy/staging/.env
# Editar: dominios, STAGING_JWT_SECRET_A/B, CORS origins con https://
```

## 2. Build del frontend

```bash
npm run build:web
# Salida: frontend/dist/
```

El frontend usa `/api` relativo cuando se sirve por HTTP; nginx enruta al backend correcto por subdominio.

## 3. Levantar el stack Docker

```bash
docker compose -f docker-compose.staging.yml --env-file deploy/staging/.env up -d --build
```

Servicios:

| Servicio | Red interna | Datos |
|----------|-------------|-------|
| `pos-api-local-a` | `:3001` | volumen `pos-data-local-a` → `/data` |
| `pos-api-local-b` | `:3001` | volumen `pos-data-local-b` → `/data` |
| `web` | `127.0.0.1:8080` | monta `frontend/dist` |
| `afip` | `:8002` | sin persistencia |

La primera vez, el entrypoint del backend ejecuta `db:init` si no existe `database.sqlite` en `/data`.

## 4. TLS en el host (Caddy)

```bash
sudo cp deploy/staging/Caddyfile.example /etc/caddy/Caddyfile
# Editar dominios reales
sudo systemctl reload caddy
```

Ejemplo [`deploy/staging/Caddyfile.example`](../../deploy/staging/Caddyfile.example):

```text
local-a.tu-dominio.com, local-b.tu-dominio.com {
    encode gzip
    reverse_proxy 127.0.0.1:8080
}
```

Solo el puerto **8080** del contenedor nginx queda expuesto en localhost; las APIs no son públicas directamente.

## 5. Bootstrap por local (manual, primera vez)

Repetir para **cada** subdominio:

### Local A — `https://local-a.tu-dominio.com`

1. Abrir la URL en el navegador del mostrador.
2. Si la BD está vacía: pantalla **Configuración inicial** → crear administrador (ej. `admin.centro`).
3. Login como admin → **Usuarios** → crear cajero (`cajero.centro`, rol **Cajero**).
4. Logout → login como cajero → **Caja** → abrir sesión → venta de prueba.

### Local B — `https://local-b.tu-dominio.com`

Mismo flujo con usuarios distintos (ej. `admin.norte`, `cajero.norte`).

### Aislamiento

Las ventas, productos y caja del Local A **no** aparecen en el Local B: cada instancia tiene su propio SQLite.

## 6. Verificación

```bash
# Script de ayuda (desde la raíz del repo)
bash scripts/staging-bootstrap.sh

# Manual — API vía nginx local
curl -fsS -H "Host: local-a.tu-dominio.com" http://127.0.0.1:8080/api
curl -fsS -H "Host: local-b.tu-dominio.com" http://127.0.0.1:8080/api

# Público con TLS
curl -fsS https://local-a.tu-dominio.com/api
curl -fsS https://local-b.tu-dominio.com/api
```

## Variables de entorno

Ver [`deploy/staging/.env.example`](../../deploy/staging/.env.example).

| Variable | Descripción |
|----------|-------------|
| `STAGING_LOCAL_A_HOST` / `STAGING_LOCAL_B_HOST` | Subdominios (nginx `server_name`) |
| `STAGING_CORS_ORIGIN_A` / `B` | Origen CORS con `https://` |
| `STAGING_JWT_SECRET_A` / `B` | Secret JWT distinto por local |
| `DEV_SKIP_LICENSE` | `true` + `STAGING=true` en compose omite licencia |
| `AFIP_PRODUCTION` | `false` para homologación |

**No commitear:** `deploy/staging/.env`, certificados `.crt`/`.key`.

## AFIP en staging

- Sin certificados: ventas y caja funcionan; la facturación AFIP fallará (esperado).
- Con homologación: copiar `user.crt` y `user.key` al volumen de cada local:

```bash
docker compose -f docker-compose.staging.yml exec pos-api-local-a ls /data/afip
# Copiar certificados al volumen (método según tu flujo de deploy)
```

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---------|------------------|--------|
| 502 en `/api` | API aún iniciando o healthcheck falló | `docker compose -f docker-compose.staging.yml logs pos-api-local-a` |
| CORS error en navegador | `STAGING_CORS_ORIGIN_*` no coincide con URL | Usar `https://` y dominio exacto |
| Pantalla en blanco / 404 assets | Falta `npm run build:web` | Rebuild frontend y reiniciar `web` |
| Licencia requerida | `DEV_SKIP_LICENSE` false o sin `STAGING=true` | Revisar compose y `.env` |
| Misma data en A y B | Mismo volumen montado | Verificar `pos-data-local-a` vs `pos-data-local-b` |
| AFIP unreachable | Contenedor `afip` caído o sin certs | `docker compose ... logs afip` |

## Impresión

En navegador web la impresión usa el diálogo del sistema, no térmica ESC/POS. Es el comportamiento esperado en este modo.

## Relacionado

- [06-desplegar-caja.md](./06-desplegar-caja.md) — producción Windows `.exe`
- [../deployment/README.md](../deployment/README.md) — índice despliegue
- [../ai/build-and-deploy.md](../ai/build-and-deploy.md) — build técnico
- [../ai/remote-connectivity-architecture.md](../ai/remote-connectivity-architecture.md) — relay remoto (fase opcional)

## Fase 2 (opcional)

Para supervisión central de ambas cajas: `docker compose -f docker-compose.remote.yml` + portal PWA. No es necesario para que vendan en staging web.
