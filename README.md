
# Point of Sale

Interfaz POS (React + Vite) con backend NestJS, integración AFIP como microservicio y shell Electron para empaquetado desktop.

> **Documentación:** [`docs/`](docs/) · **Agentes IA:** [`AGENTS.md`](AGENTS.md)

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

## Estructura del monorepo

```text
Point_of_Sale/
├── frontend/          # React + Vite (UI del POS)
├── backend/           # NestJS pos-api (cliente HTTP → AFIP)
├── desktop/           # Electron (instalador .exe)
├── services/afip/     # Despliegue del microservicio fiscal (NO es el código Python)
├── scripts/           # Verificación de microservicios
├── docker-compose.dev.yml
├── package.json       # Orquestación (dev:stack, dist:win, etc.)
└── README.md
```

### Microservicio AFIP (importante)

`servicio_afip` es un **microservicio Python aparte**. El código vive en otro repo:

https://github.com/REPOSITORIO-PROYECTOS/servicio_afip

En **este** repo, `services/afip/` solo tiene:

- `Dockerfile` — clona `servicio_afip` al build
- `build-sidecar.ps1` — genera `afip-service.exe` para producción
- docs y `.env.example`

**No** está mezclado con `backend/` ni con `frontend/`. pos-api solo lo consume por HTTP en `:5086`.

Detalle: [`services/afip/README.md`](services/afip/README.md)

## Requisitos

- Node.js 20+
- npm
- Docker Desktop (solo para servicio AFIP en desarrollo)
- Certificados AFIP (`user.crt`, `user.key`) en `services/afip/` para emisión real

## Setup inicial

```powershell
# Raíz (orquestación)
npm install

# Frontend
cd frontend
npm install
cd ..

# Backend
cd backend
copy .env.example .env
npm install
npm run db:init
cd ..

# Desktop (Electron)
cd desktop
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

Electron abre `http://localhost:5173`. El backend NestJS se levanta por separado (`npm run dev:api`) o lo spawneará Electron en modo desktop.

## Datos y persistencia (SQLite)

El POS guarda productos, ventas, caja e inventario en **SQLite local**. No hay servidor de base de datos aparte.

| Entorno | Ruta de la base | Cómo se inicializa |
|---|---|---|
| Desarrollo (`npm run dev:api`) | `backend/storage/database.sqlite` | `cd backend && npm run db:init` |
| Desktop / `.exe` empaquetado | `%APPDATA%\PointOfSale\database.sqlite` | Misma inicialización apuntando a AppData (ver abajo) |
| Docker (`docker compose`) | Volumen `pos-api-storage` | Automático al primer arranque del contenedor |

### Directorios de datos en producción (PC del mostrador)

Electron y el backend empaquetado usan `%APPDATA%\PointOfSale\`:

```text
%APPDATA%\PointOfSale\
├── database.sqlite      # BD principal del POS
├── uploads/             # archivos subidos
├── logs/                # logs locales
└── afip/                # certificados AFIP (NO van en el instalador)
    ├── user.crt
    ├── user.key
    └── config.json      # CUIT, punto de venta (vía API o importación)
```

### Inicializar la BD antes del primer uso del `.exe`

```powershell
cd backend
$env:APP_DATA_DIR = "$env:APPDATA\PointOfSale"
npm run db:init
```

Sin este paso, el `.exe` puede abrir la UI pero la API falla al crear tablas en caliente.

### Desarrollo vs producción (datos)

- **Desarrollo:** datos en `backend/storage/` (ignorado por Git). Certificados AFIP de prueba en `services/afip/` o `backend/storage/afip/`.
- **Producción / `.exe`:** datos y certificados en `%APPDATA%\PointOfSale\`. **Nunca** commitear `.env`, certificados ni `database.sqlite`.
- **AFIP:** el backend **no** guarda lógica fiscal; solo llama al microservicio Python en `:5086`. Ver sección AFIP más abajo.

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

## Build desktop (instalador local)

### Qué genera cada comando

| Comando | Incluye | AFIP sidecar | Salida |
|---|---|---|---|
| `npm run dist:win` | UI + backend embebido | No | `desktop/release/` |
| `npm run dist:win:fiscal` | UI + backend + `afip-service.exe` | Sí | `desktop/release/` |

El `.exe` **no sube a Git** (está en `.gitignore`). Se genera en la máquina de build y se distribuye por USB, Release de GitHub o carpeta compartida.

### Prerrequisitos del build (Windows)

```powershell
# 1. Dependencias (una vez)
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd desktop && npm install && cd ..

# 2. Embeber Node.js para el backend empaquetado (una vez por versión de Node)
#    El .exe no asume Node instalado en la PC del cliente.
$node = (Get-Command node).Source
New-Item -Force -ItemType Directory desktop\resources\nodejs | Out-Null
Copy-Item $node desktop\resources\nodejs\node.exe -Force

# 3. Build completo
npm run build:all

# 4. Instalador (elegir uno)
npm run dist:win          # POS sin facturación local
npm run dist:win:fiscal   # POS con afip-service.exe (requiere Python 3.11 para build:afip-sidecar)
```

### Probar el `.exe` sin instalador (carpeta `win-unpacked`)

Tras el build, la app runnable está en:

```text
desktop/release/win-unpacked/Point of Sale.exe
```

### Problemas conocidos del build (y solución)

| Síntoma | Causa | Solución |
|---|---|---|
| Ventana en blanco al abrir el `.exe` | Vite generaba rutas `/assets/...` inválidas en `file://` | Corregido: `base: './'` en `frontend/vite.config.ts` |
| App se cierra sola / no se ve nada | Backend no levantaba a tiempo | Electron abre la UI aunque la API tarde; inicializar BD con `db:init` |
| `EBUSY` / `EPERM` al buildear | Archivos bloqueados en `desktop/release` o `backend/dist` | Cerrar `.exe`/Node; `npm run publish:win` limpia `release` antes de empaquetar |
| Instalador NSIS colgado | Firma de código (`signtool`) | `forceCodeSigning: false` en `electron-builder.yml` |
| API no responde en `.exe` | Falta `node.exe` embebido o BD no inicializada | Copiar `node.exe` a `desktop/resources/nodejs/` y correr `db:init` con `APP_DATA_DIR` |

### Qué hace el `.exe` al abrirse

1. Carga la UI React desde `resources/frontend/` (rutas relativas `./assets/...`).
2. Spawnea **pos-api** con `resources/nodejs/node.exe` → `127.0.0.1:3001`.
3. Spawnea **afip-service.exe** solo si fue empaquetado (`dist:win:fiscal`) → `127.0.0.1:5086`.
4. Lee/escribe datos en `%APPDATA%\PointOfSale\`.

## Despliegue: desarrollo, instalador local y producción

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ DESARROLLO (programadores)                                              │
│   npm run dev:stack  →  Vite :5173 + Nest :3001 + AFIP Docker :5086     │
│   npm run dev:desktop  →  Electron apuntando a localhost:5173           │
│   Datos: backend/storage/                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ INSTALADOR LOCAL (probar en tu PC antes de llevar a caja)               │
│   npm run dist:win  o  dist:win:fiscal                                  │
│   Ejecutar: desktop/release/win-unpacked/Point of Sale.exe              │
│   Datos: %APPDATA%\PointOfSale\  (inicializar con db:init)              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PRODUCCIÓN (caja registradora / mostrador)                              │
│   Instalar .exe generado con dist:win:fiscal                            │
│   Copiar certificados AFIP a %APPDATA%\PointOfSale\afip\                │
│   Sin Docker — Electron levanta pos-api + afip-service.exe localmente   │
│   Datos: %APPDATA%\PointOfSale\ (persisten entre reinicios)             │
└─────────────────────────────────────────────────────────────────────────┘
```

### AFIP: sidecar en cada entorno

| Entorno | Motor AFIP | Comando / acción |
|---|---|---|
| Dev | Docker | `npm run dev:afip` |
| Dev (sin Docker) | Sidecar `.exe` local | `npm run build:afip-sidecar` + `$env:SPAWN_AFIP_SIDECAR='true'` + `npm run dev:desktop` |
| Instalador local sin fiscal | Ninguno (POS mock / sin CAE) | `npm run dist:win` |
| Producción caja | Sidecar embebido | `npm run dist:win:fiscal` + certificados en AppData |

Detalle sidecar y certificados: [`services/afip/PRODUCTION.md`](services/afip/PRODUCTION.md)

Código Python del microservicio (repo aparte): https://github.com/REPOSITORIO-PROYECTOS/servicio_afip

En la PC del cliente, colocar certificados en `%APPDATA%/PointOfSale/afip/` (`user.crt`, `user.key`).

## Carpetas clave

- [`frontend/`](frontend/) — React + Vite UI
- [`backend/`](backend/) — NestJS pos-api (sin lógica fiscal; proxy HTTP a AFIP)
- [`services/`](services/) — Microservicios externos (ver [`services/README.md`](services/README.md))
- [`services/afip/`](services/afip/) — Despliegue Docker/sidecar del motor fiscal Python
- [`desktop/`](desktop/) — Electron main/preload + electron-builder

## Documentación adicional

- **Documentación:** [`docs/`](docs/) · [`docs/casos-de-uso/`](docs/casos-de-uso/)
- **Agentes IA:** [`AGENTS.md`](AGENTS.md) · [`docs/ai/`](docs/ai/)
- Backend: [`backend/README.md`](backend/README.md)
- Servicios externos: [`services/README.md`](services/README.md)
- Microservicio AFIP: [`services/afip/README.md`](services/afip/README.md)
- AFIP upstream (código Python): https://github.com/REPOSITORIO-PROYECTOS/servicio_afip

## Fase siguiente (roadmap)

- Conectar frontend al backend REST (reemplazar mocks de `wails-bridge.ts`)
- Checkout con emisión fiscal CAE end-to-end
- Script `npm run prepare:desktop-node` para copiar `node.exe` automáticamente
- GitHub Release con `.exe` versionado (no en el repo)
