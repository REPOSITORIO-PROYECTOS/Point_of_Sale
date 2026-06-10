# Caso 05 — Build instalador local (`.exe`)

**Objetivo:** Generar el ejecutable para probar en tu PC (no es dev diario).

## Prerrequisitos

- Setup inicial hecho ([setup-inicial.md](../getting-started/setup-inicial.md))
- Node embebido copiado (una vez):

```powershell
$node = (Get-Command node).Source
New-Item -Force -ItemType Directory desktop\resources\nodejs | Out-Null
Copy-Item $node desktop\resources\nodejs\node.exe -Force
```

## Build

```powershell
npm run build:all

# Sin AFIP embebido
npm run dist:win

# Con AFIP sidecar (Python 3.11)
npm run build:afip-sidecar
npm run dist:win:fiscal
```

## Salida

```text
desktop/release/win-unpacked/Point of Sale.exe
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
| API no responde | Falta node embebido | Copiar `node.exe` a `desktop/resources/nodejs/` |

Detalle: [../deployment/README.md](../deployment/README.md) · [../ai/build-and-deploy.md](../ai/build-and-deploy.md)

## Para dev diario

Usar `npm run dev:stack`, **no** rebuild del `.exe` en cada cambio.
