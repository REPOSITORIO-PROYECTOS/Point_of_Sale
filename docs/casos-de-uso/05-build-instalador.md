# Caso 05 — Build instalador local (`.exe`)

**Objetivo:** Generar el ejecutable para probar en tu PC (no es dev diario).

## Prerrequisitos

- Setup inicial hecho ([setup-inicial.md](../getting-started/setup-inicial.md))
- `backend/src/license/keys/license-public.pem` presente (no está en git; ver [licensing.md](../ai/licensing.md))
- Node en PATH (se copia a `desktop/resources/nodejs/node.exe` al empaquetar)

## Build

```powershell
npm run build:electron-all
npm run prepare:backend-pack   # o se ejecuta solo con dist:win

# Sin AFIP embebido
npm run dist:win

# Con AFIP sidecar (Python 3.11)
npm run build:afip-sidecar
npm run dist:win:fiscal
```

## Salida

```text
desktop/release/Point-of-Sale-Setup.exe    # instalador NSIS
desktop/release/win-unpacked/Point of Sale.exe   # con dist:win:dir
```

## Si OneDrive bloquea (`EBUSY`)

```powershell
cd desktop
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
npx electron-builder --dir --win --config electron-builder.yml --config.directories.output=C:/Temp/pos-build
```

Ejecutable: `C:\Temp\pos-build\win-unpacked\Point of Sale.exe`

## Antes de abrir el `.exe`

```powershell
cd backend
$env:APP_DATA_DIR = "$env:APPDATA\PointOfSale"
npm run db:init
```

## Problemas conocidos

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Pantalla blanca | Rutas `/assets/` | Ya corregido: `base: './'` en vite |
| App se cierra | BD no init | `db:init` con APP_DATA_DIR |
| API no responde | Módulos nativos / licencia | `npm run prepare:backend-pack -Force`; verificar `license-public.pem` en dist |

Detalle: [../deployment/README.md](../deployment/README.md) · [../ai/build-and-deploy.md](../ai/build-and-deploy.md)

## Para dev diario

Usar `npm run dev:stack`, **no** rebuild del `.exe` en cada cambio.
