# Integración frontend ↔ backend

Referencia breve sobre cómo se conecta la UI React con la API NestJS y dónde se persisten los datos.

## Diagrama por entorno

```text
DESARROLLO (npm run dev:stack)
------------------------------
Browser/Electron → Vite :5173
                      │ fetch /api/*
                      ▼ (proxy vite.config.ts)
                 NestJS :3001/api/*
                      │
                      ▼
              SQLite backend/storage/database.sqlite


ELECTRON PRODUCCIÓN (.exe)
--------------------------
UI file:// (React embebido)
      │ fetch → http://127.0.0.1:3001/api/*  (requiere VITE_API_BASE_URL absoluto en build)
      ▼
node.exe spawnea pos-api :3001
      │
      ▼
SQLite %APPDATA%\PointOfSale\database.sqlite
```

## Capas en el frontend

| Capa | Archivo | Rol |
|------|---------|-----|
| **PosAPI** | `frontend/src/lib/pos-api.ts` | Cliente REST real hacia NestJS. JWT en `localStorage` (`pos.auth.token`). |
| **WailsAPI** | `frontend/src/lib/wails-bridge.ts` | Legacy/demo: mocks en memoria si no hay Wails. Impresión y cajón vía Electron o navegador. |
| **desktop-api** | `frontend/src/lib/desktop-api.ts` | Puente Electron (`window.desktop.printReceipt`). |

### Proxy en desarrollo

`frontend/vite.config.ts` redirige `/api` → `http://127.0.0.1:3001`. El frontend usa rutas relativas (`/api/products`, etc.) sin problemas de CORS.

Variable opcional: `VITE_API_BASE_URL` (por defecto `/api`).

## PosAPI vs WailsAPI — qué persiste

| Funcionalidad | Cliente usado | ¿Persiste en SQLite? |
|---------------|---------------|----------------------|
| Login / setup admin | PosAPI | Sí (`users`) |
| Licencia | PosAPI | Sí (`license_settings`) |
| Tema / logo | PosAPI (WailsAPI solo en entorno Wails) | Sí (`theme_settings` + `uploads/`) |
| Productos / inventario | PosAPI | Sí (`products`) |
| Ventas (checkout) | PosAPI | Sí (`sales`) |
| Caja (apertura/cierre) | PosAPI | Sí (`cash_sessions`, `cash_movements`) |
| Encomiendas | PosAPI | Sí (`parcels`) — **opcional** vía Configuración de Negocio |
| AFIP config | PosAPI | Archivos en `storage/afip/` o `%APPDATA%/PointOfSale/afip/` |
| Impresión de ticket | WailsAPI / desktop-api | No (solo impresión local) |
| Cajón de dinero | WailsAPI / desktop-api | No (solo señal local) |

### Estado unificado vs pendiente (2026-06)

| Funcionalidad | Estado |
|---------------|--------|
| Productos, ventas, caja, usuarios, encomiendas, tema, licencia | **Unificado** → SQLite vía PosAPI |
| Historial ventas (`GET /sales`) | **Unificado** |
| Movimientos caja (`GET /cash`) | **Unificado** |
| Auditoría / cierres históricos | **Unificado** — historial con cajero, tickets y montos |
| Notas de crédito / devoluciones | **Sin API** — UI vacía |
| Emparejamiento remoto en UI POS | **Implementado** — Ajustes → Conexión Remota + portal Emparejar |

**Eliminado:** `mock-data.ts` y datos fake en `wails-bridge.ts` (cafés, caja demo, etc.).

`WailsAPI` queda **solo** para impresión y cajón. Todo lo demás → **PosAPI**.

## Modelo remoto — qué hay y qué falta

Ver detalle en [`docs/ai/remote-connectivity-architecture.md`](../ai/remote-connectivity-architecture.md).

```text
POS (SQLite) ── agente NestJS ──► relay :5090 ──► portal PWA :5174
```

| Implementado | Falta |
|--------------|-------|
| Agente backend (`/api/remote/pair`, WS, snapshots) | Pantalla pairing en frontend POS |
| Relay + portal dev (`npm run dev:remote`) | Cola offline `remote_outbox` |
| Portal login con bcrypt + token de sesión | PostgreSQL en relay (prod) |
| Snapshots: caja, ventas día, stock, licencia | Comando remoto `disable_user` vía WS |
| `device.json` en AppData | Multi-sucursal completo en portal |
| Historial cierres de caja en auditoría | Badge “nube conectada” en POS |

El agente **lee** datos unificados de SQLite (no mocks). El portal **nunca** accede a SQLite directo.

## Backend NestJS

- Prefijo global: `/api` (`backend/src/main.ts`)
- Host/puerto: `127.0.0.1:3001` (`.env`)
- CORS: `localhost`, `127.0.0.1`, `file://` (Electron)
- Swagger: http://127.0.0.1:3001/api/docs

### Endpoints clave

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/setup-status` | ¿Requiere crear admin? |
| POST | `/api/auth/setup` | Primer admin |
| POST | `/api/auth/login` | Login JWT |
| GET | `/api/auth/me` | Usuario actual |
| GET/POST/PUT/DELETE | `/api/products` | CRUD productos |
| POST | `/api/sales` | Registrar venta |
| GET/POST | `/api/cash/session` | Sesión de caja actual |
| GET | `/api/cash/sessions/history` | Historial de cierres de caja |
| GET/PUT | `/api/settings/business` | Datos del negocio + toggle encomiendas |
| GET/PUT | `/api/settings/theme` | Tema del POS |
| GET | `/api/license/status` | Estado de licencia |
| GET/POST | `/api/integrations/afip/*` | Config y facturación AFIP |

Auth: header `Authorization: Bearer <token>` en rutas protegidas.

## Persistencia de datos

### SQLite

| Entorno | Ruta |
|---------|------|
| Desarrollo | `backend/storage/database.sqlite` |
| `.exe` / caja | `%APPDATA%\PointOfSale\database.sqlite` |
| Override | `APP_DATA_DIR` o `SQLITE_DB_PATH` en `.env` |

Tablas principales: `users`, `products`, `sales`, `cash_sessions`, `cash_movements`, `inventory_items`, `parcels`, `theme_settings`, `license_settings`.

Inicialización:

```powershell
cd backend
copy .env.example .env   # si no existe
npm install
npm run db:init          # migraciones + schema TypeORM
```

Si `db:init` falla por DI con `tsx`, levantar una vez `npm run start:dev`: TypeORM crea las tablas al arrancar.

### Archivos en disco

```text
backend/storage/                    (dev)
%APPDATA%\PointOfSale\            (prod)
├── database.sqlite
├── uploads/          ← logos de tema
├── branding/
├── logs/
├── afip/             ← certificados (user.crt, user.key, config.json)
└── remote/           ← sync remoto (opcional)
```

### Sesión en el navegador

- `localStorage`: `pos.auth.token`, `pos.auth.user`
- No se guardan en SQLite

## Flujo de una venta

```text
POSScreenEnhanced
  → PosAPI.createSale(transaction, payments)
  → POST /api/sales (JWT)
  → SalesService persiste en SQLite + actualiza caja/stock
  → WailsAPI.printReceipt (Electron o ventana de impresión del navegador)
```

## Instalación y verificación rápida

```powershell
# Desde la raíz del monorepo
npm install
cd frontend && npm install && cd ..
cd backend && copy .env.example .env && npm install && npm run db:init && cd ..
cd desktop && npm install && cd ..

# Stack mínimo (sin AFIP Docker)
npm run dev:api    # terminal 1
npm run dev:web    # terminal 2
```

Verificar:

```powershell
curl http://127.0.0.1:3001/api/auth/setup-status
# {"needsSetup":true} en BD vacía

curl http://127.0.0.1:3001/api/docs
# Swagger UI (200)
```

Frontend: http://localhost:5173 — primer uso pide crear usuario admin.

## Riesgos conocidos

1. **Electron empaquetado (`file://`)**: `/api` relativo no funciona. El build desktop debe usar `VITE_API_BASE_URL=http://127.0.0.1:3001/api`.
2. **Clave pública de licencia**: en producción requiere `backend/src/license/keys/license-public.pem`. En dev con `DEV_SKIP_LICENSE=true` el backend arranca sin ese archivo.
3. **AFIP opcional**: ventas se guardan sin facturación; AFIP requiere microservicio en `:5086`.
4. **No versionar**: `.env`, `database.sqlite`, certificados AFIP.

## Referencias

- [README raíz](../../README.md)
- [Arquitectura](../architecture/README.md)
- [Datos y persistencia](../data/README.md)
- Cliente REST: `frontend/src/lib/pos-api.ts`
- Proxy Vite: `frontend/vite.config.ts`
