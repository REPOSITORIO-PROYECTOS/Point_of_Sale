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
npm run build:web

# 2. Embeber Node (obligatorio; no está en git)
$node = (Get-Command node).Source
New-Item -Force -ItemType Directory desktop\resources\nodejs | Out-Null
Copy-Item $node desktop\resources\nodejs\node.exe -Force

# 3. Empaquetar
npm run dist:win          # sin AFIP
# o
npm run build:afip-sidecar  # Python 3.11
npm run dist:win:fiscal     # con AFIP
```

Salida: `desktop/release/win-unpacked/Point of Sale.exe`

### Si OneDrive bloquea (`EBUSY` / `EPERM`)

```powershell
cd desktop
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
npx electron-builder --dir --win --config electron-builder.yml --config.directories.output=C:/Temp/pos-build
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

## Gotchas de build (IA debe conocer)

| Issue | Fix |
|-------|-----|
| Pantalla blanca en `.exe` | `base: './'` en `frontend/vite.config.ts` |
| App cierra sola | `db:init` con APP_DATA_DIR; backend spawn con `node.exe` embebido |
| NSIS colgado | `forceCodeSigning: false` en electron-builder yml |
| `.exe` no en repo | Normal; output en `desktop/release/` gitignored |
