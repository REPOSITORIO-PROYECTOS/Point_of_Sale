
# Point of Sale

Interfaz POS (React + Vite) con backend NestJS, integración AFIP como microservicio y shell Electron para empaquetado desktop.

## Arquitectura

| Servicio | Puerto | Descripción |
|---|---|---|
| Frontend (Vite) | `5173` | UI del POS (mock vía Wails bridge en dev web) |
| pos-api (NestJS) | `3001` | API de negocio + cliente HTTP a AFIP |
| servicio_afip (Python) | `5086` (host) / `8002` (container) | Motor fiscal AFIP |

```text
Frontend ──(futuro REST)──> pos-api ──HTTP──> servicio_afip ──> AFIP/ARCA
                               │
                            SQLite
```

Electron (desktop) levanta **procesos locales** en la PC del mostrador. **Docker no corre dentro del `.exe`**; solo se usa en desarrollo.

```text
DESARROLLO (programadores)          PRODUCCION (caja registradora)
-----------------------------          -------------------------------
Docker -> servicio_afip :5086          Electron spawnea afip-service.exe :5086
npm -> pos-api :3001                   Electron spawnea pos-api :3001
Vite -> frontend :5173                 UI embebida en el instalador
```

| Entorno | AFIP | Comando |
|---|---|---|
| Dev | Docker | `npm run dev:afip` |
| Dev (sin Docker) | Sidecar `.exe` | `npm run build:afip-sidecar` + `SPAWN_AFIP_SIDECAR=true` |
| Produccion | Sidecar embebido | `npm run dist:win:fiscal` |

Certificados AFIP en produccion: `%APPDATA%/PointOfSale/afip/` (`user.crt`, `user.key`).

Detalle: [`services/afip/PRODUCTION.md`](services/afip/PRODUCTION.md) y [`desktop/README.md`](desktop/README.md).

## Requisitos

- Node.js 20+
- npm
- Docker Desktop (solo para servicio AFIP en desarrollo)
- Certificados AFIP (`user.crt`, `user.key`) en `services/afip/` para emisión real

## Setup inicial

```powershell
# Raíz
npm install

# Backend
cd backend
copy .env.example .env
npm install
npm run db:init

# Desktop (Electron)
cd ../desktop
npm install
```

## Desarrollo

### Opción A — Stack completo (web + api + afip)

```powershell
npm run dev:stack
```

### Opción B — Servicios por separado

```powershell
# Terminal 1 — AFIP
npm run dev:afip

# Terminal 2 — Backend
npm run dev:api

# Terminal 3 — Frontend
npm run dev:web
```

### Electron en desarrollo

Con web, api y afip corriendo (o al menos api):

```powershell
npm run dev:stack
npm run dev:desktop
```

Electron abre `http://localhost:5173` y spawneará el backend NestJS localmente.

## Health checks

```powershell
# Backend
curl http://127.0.0.1:3001/api

# Integración AFIP (desde pos-api)
curl http://127.0.0.1:3001/api/integrations/afip/health

# AFIP directo
curl http://127.0.0.1:5086/api/afipws/test
```

## Verificación de microservicios

Tests unitarios (contrato HTTP, sin servidor):

```powershell
npm run test:microservices:unit
```

Verificación en vivo (pos-api + AFIP si está levantado):

```powershell
# Terminal 1
cd backend && npm run start:dev

# Terminal 2 (opcional AFIP)
npm run dev:afip

# Terminal 3
npm run test:microservices
```

Si el puerto 3001 está ocupado: `$env:PORT=3010` y `$env:POS_API_URL='http://127.0.0.1:3010/api'`.

Swagger pos-api: http://127.0.0.1:3001/api/docs

Swagger AFIP: http://127.0.0.1:5086/swagger/

## Docker (AFIP + pos-api)

```powershell
docker compose -f docker-compose.dev.yml up --build
```

## Build desktop (.exe)

Instalador POS (sin motor fiscal embebido):

```powershell
npm run build:all
npm run dist:win
```

Instalador POS **con AFIP sidecar** (para caja registradora, sin Docker):

```powershell
npm run dist:win:fiscal
```

Instaladores en `desktop/release/`.

En la PC del cliente, colocar certificados en `%APPDATA%/PointOfSale/afip/`.

## Carpetas clave

- [`backend/`](backend/) — NestJS pos-api
- [`services/afip/`](services/afip/) — Motor fiscal (Docker build clona repo upstream)
- [`desktop/`](desktop/) — Electron main/preload + electron-builder

## Documentación adicional

- Backend: [`backend/README.md`](backend/README.md)
- AFIP service: [`services/afip/README.md`](services/afip/README.md)

## Fase siguiente (no incluida aún)

- Conectar frontend al backend REST (reemplazar mocks de `wails-bridge.ts`)
- Checkout con emisión fiscal CAE
- Sidecar Python AFIP empaquetado en el instalador
