# Electron desktop shell

Shell de escritorio que empaqueta UI + backend NestJS (+ AFIP sidecar opcional) en un `.exe` para Windows.

Documentación general del monorepo: [`../README.md`](../README.md)

## Qué corre al abrir el `.exe` (sin Docker)

1. Electron carga la UI React desde `resources/frontend/`
2. Spawnea **pos-api** con `resources/nodejs/node.exe` → `127.0.0.1:3001`
3. Spawnea **afip-service.exe** solo si el build fue `dist:win:fiscal` → `127.0.0.1:5086`
4. Persiste datos en `%APPDATA%\PointOfSale\` (SQLite, uploads, logs, certificados AFIP)

Si el sidecar AFIP no está empaquetado, el POS sigue funcionando con datos mock; la facturación fiscal requiere AFIP en `:5086`.

## Datos antes del primer arranque

```powershell
cd ..\backend
$env:APP_DATA_DIR = "$env:APPDATA\PointOfSale"
npm run db:init
```

Sin esto la UI puede abrir pero la API no tiene tablas creadas.

## Modo desarrollo

```powershell
# Terminal 1 — stack web (Vite + API + AFIP Docker)
npm run dev:stack

# Terminal 2 — Electron apuntando a localhost:5173
npm run dev:desktop
```

Probar sidecar AFIP local sin Docker:

```powershell
npm run build:afip-sidecar
$env:SPAWN_AFIP_SIDECAR = 'true'
npm run dev:desktop
```

## Builds

| Comando (desde raíz) | Resultado |
|---|---|
| `npm run dist:win` | POS sin sidecar AFIP |
| `npm run dist:win:fiscal` | POS + `afip-service.exe` embebido |

Salida por defecto: `desktop/release/` (`win-unpacked/` + instalador NSIS/portable).

### Prerrequisito: embeber Node.js

Antes del primer `dist:win`, copiar Node al bundle:

```powershell
$node = (Get-Command node).Source
New-Item -Force -ItemType Directory resources\nodejs | Out-Null
Copy-Item $node resources\nodejs\node.exe -Force
```

`resources/nodejs/` está en `.gitignore` (~70 MB). Hay que repetirlo al cambiar versión de Node.

### Si el build falla con `EPERM`

Cerrá Point of Sale y procesos que usen `desktop/release`. Para publicar: `npm run publish:win` (limpia `release` automáticamente).

## Variables útiles

| Variable | Default | Uso |
|---|---|---|
| `SPAWN_AFIP_SIDECAR` | auto (solo si existe `.exe`) | Forzar/no spawn del sidecar |
| `AFIP_SIDECAR_PATH` | auto | Ruta manual al sidecar |
| `POS_BACKEND_NODE` | `resources/nodejs/node.exe` | Override del Node embebido |
| `APP_DATA_DIR` | `%APPDATA%\PointOfSale` | Override de datos |
| `PORT` | `3001` | Puerto de pos-api |

## Documentación relacionada

- AFIP sidecar producción: [`../services/afip/PRODUCTION.md`](../services/afip/PRODUCTION.md)
- Microservicio AFIP (Docker/dev): [`../services/afip/README.md`](../services/afip/README.md)
- Backend / SQLite: [`../backend/README.md`](../backend/README.md)
