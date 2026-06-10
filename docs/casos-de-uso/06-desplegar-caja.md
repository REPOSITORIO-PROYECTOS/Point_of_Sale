# Caso 06 — Desplegar en caja registradora

**Objetivo:** Instalar el POS en el mostrador con facturación local, sin Docker.

## Resumen

1. Generar instalador **fiscal**: `npm run dist:win:fiscal`
2. Instalar `.exe` en la PC del mostrador
3. Copiar certificados AFIP a AppData
4. Inicializar BD en AppData (primera vez)

## Build (máquina de desarrollo)

```powershell
npm run build:afip-sidecar
npm run dist:win:fiscal
```

Distribuir el instalador de `desktop/release/` (USB, Release GitHub, etc.). **No** subir `.exe` a Git.

## En la PC del mostrador

### Certificados AFIP

Copiar a:

```text
%APPDATA%\PointOfSale\afip\
├── user.crt
└── user.key
```

### Base de datos (primera vez)

En máquina de build o script de instalación:

```powershell
cd backend
$env:APP_DATA_DIR = "$env:APPDATA\PointOfSale"
npm run db:init
```

O dejar que el operador ejecute un script equivalente post-instalación.

## Qué hace el `.exe` al iniciar

1. UI React embebida
2. Spawnea **pos-api** (`node.exe` embebido) → `:3001`
3. Spawnea **afip-service.exe** → `:5086`
4. Datos persistentes en `%APPDATA%\PointOfSale\`

**Sin Docker.**

## Documentación detallada

- [../../services/afip/PRODUCTION.md](../../services/afip/PRODUCTION.md)
- [../deployment/README.md](../deployment/README.md)
- [../data/README.md](../data/README.md)

## Soporte

Health checks en la caja:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api
Invoke-RestMethod http://127.0.0.1:5086/api/afipws/test
```
