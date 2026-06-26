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
| `POS_DISABLE_AUTO_UPDATE` | — | `true` desactiva búsqueda de actualizaciones |
| `GH_UPDATER_TOKEN` | — | PAT GitHub (lectura releases); preferir `updater.env` en AppData |

## Auto-actualización en cajas

El `.exe` empaquetado consulta **GitHub Releases** (`electron-updater`). El repo es privado: cada caja necesita un token de lectura o desactivar el updater.

### Configurar una caja (recomendado)

```powershell
# Desde la raíz del repo, en la PC de la caja:
.\scripts\deploy-updater-config.ps1 -Token ghp_tu_pat_solo_lectura
```

Esto escribe `%APPDATA%\PointOfSale\updater.env`. Reiniciá Point of Sale.

Plantilla manual: copiar [`updater.env.example`](../updater.env.example) → `%APPDATA%\PointOfSale\updater.env`.

### Desactivar actualizaciones (sin token)

```powershell
.\scripts\deploy-updater-config.ps1 -Disable
# o variable de usuario: POS_DISABLE_AUTO_UPDATE=true
```

### Publicar nueva versión (desde dev)

```powershell
npm run version:set 0.0.5
git add -A && git commit -m "chore: release 0.0.5"
git tag v0.0.5
git push && git push origin v0.0.5   # CI publica en Releases
# o local:
npm run publish:win:fiscal
```

Verificá en GitHub Releases: `Point-of-Sale-Setup.exe` + `latest.yml`.

### Troubleshooting

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Banner 404 / `releases.atom` | Sin token o sin release publicado | `deploy-updater-config.ps1 -Token ...` y publicar release |
| Token inválido | PAT expirado | Renovar PAT y actualizar `updater.env` |
| Sin banner pero no actualiza | `POS_DISABLE_AUTO_UPDATE=true` | Quitar flag o usar `-Token` en deploy script |

Los datos en AppData (SQLite, certificados AFIP) **no se borran** al instalar una actualización.

## Documentación relacionada

- AFIP sidecar producción: [`../services/afip/PRODUCTION.md`](../services/afip/PRODUCTION.md)
- Microservicio AFIP (Docker/dev): [`../services/afip/README.md`](../services/afip/README.md)
- Backend / SQLite: [`../backend/README.md`](../backend/README.md)
