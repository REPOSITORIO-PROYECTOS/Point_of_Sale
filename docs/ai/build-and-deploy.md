# Build e instalador / producción

**No confundir con dev.** Para probar funcionalidad usar `npm run dev:stack` (ver [dev-runbook.md](./dev-runbook.md)).

## Tipos de entrega

| Tipo | Comando | AFIP | Datos |
|------|---------|------|-------|
| Dev | `dev:stack` | Docker :5086 | `backend/storage/` |
| Instalador local prueba | `dist:win` | No | `%APPDATA%\PointOfSale\` |
| Instalador fiscal | `dist:win:fiscal` | `afip-service.exe` embebido | `%APPDATA%\PointOfSale\` |
| Producción caja | Instalar `.exe` fiscal | Sidecar local | AppData persistente |

## Build `.exe` — pasos

```powershell
# 1. Deps + builds
npm install
npm install --prefix frontend
cd backend; npm install; npm run build; cd ..
cd desktop; npm install; npm run build; cd ..
npm run build:web:electron

# 2. Empaquetar (ensure:embedded-node copia node.exe; prepare-backend-pack valida licencia y nativos)
npm run dist:win          # sin AFIP → desktop/release/Point-of-Sale-Setup.exe
# o
npm run build:afip-sidecar  # Python 3.11
npm run dist:win:fiscal     # con AFIP
```

Salida instalador: `desktop/release/Point-of-Sale-Setup.exe`  
Salida portable (sin NSIS): `npm run dist:win:dir` → `desktop/release/win-unpacked/`

El backend en `.exe` usa por defecto **node.exe embebido** (`resources/nodejs/node.exe`, copiado automáticamente desde el Node del sistema).

Alternativa más liviana: `POS_USE_ELECTRON_AS_NODE=true` + Visual Studio Build Tools → `electron-rebuild` en `prepare-backend-pack`.

### Si el build falla con `EPERM` / `EBUSY`

Cerrá Point of Sale y cualquier proceso que use `desktop/release` o `backend/dist`, luego reintentá. Override opcional de carpeta de salida:

```powershell
$env:POS_BUILD_DIR = 'C:\Temp\pos-build'
npm run installer
```

## Antes de abrir el `.exe`

```powershell
cd backend
$env:APP_DATA_DIR = "$env:APPDATA\PointOfSale"
npm run db:init
```

## Sidecar AFIP (build)

```powershell
npm run build:afip-sidecar
# → services/afip/dist/afip-service.exe
# Clona: github.com/REPOSITORIO-PROYECTOS/servicio_afip
```

Requisitos: Python 3.11, Git, PyInstaller (instalado por el script).

## Producción en caja registradora

1. Instalar `.exe` de `dist:win:fiscal`
2. Copiar `user.crt` y `user.key` a `%APPDATA%\PointOfSale\afip\`
3. **Sin Docker** — Electron spawnea pos-api + afip-service.exe
4. Datos persisten en AppData entre reinicios

Detalle humano: [`services/afip/PRODUCTION.md`](../../services/afip/PRODUCTION.md)

## Auto-actualización (cajas con `.exe`)

1. **Publicar** versión en GitHub Releases (`latest.yml` + `Point-of-Sale-Setup.exe`):
   - Tag `vX.Y.Z` → workflow [`.github/workflows/release-desktop.yml`](../../.github/workflows/release-desktop.yml)
   - O local: `npm run publish:win:fiscal` (requiere `GITHUB_TOKEN` en `backend/.env`)
2. **Configurar cada caja** con PAT de solo lectura:
   ```powershell
   .\scripts\deploy-updater-config.ps1 -Token ghp_...
   ```
3. Reiniciar POS → footer **Buscar actualización** o esperar check automático (~30 s).

Sin token: usar `deploy-updater-config.ps1 -Disable` o actualización manual (USB + reinstalar `.exe`).

Ver también [`desktop/README.md`](../../desktop/README.md) (troubleshooting 404).

## Gotchas de build (IA debe conocer)

| Issue | Fix |
|-------|-----|
| Pantalla blanca en `.exe` | `base: './'` en `frontend/vite.config.ts` |
| App cierra sola | BD no init; módulos nativos | `db:init` con APP_DATA_DIR; `npm run prepare:backend-pack -Force` (rebuild Electron) |
| Falta license-public.pem | Build sin postbuild | `npm run build:api` y volver a empaquetar |
| NSIS colgado / sin Setup.exe | Code signing o archivos bloqueados | `CSC_IDENTITY_AUTO_DISCOVERY=false` (ya en scripts); cerrar `.exe` antes de rebuild |
| `.exe` no en repo | Normal; output en `desktop/release/` gitignored |
