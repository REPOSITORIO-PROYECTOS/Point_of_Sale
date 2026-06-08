# AFIP sidecar para produccion (sin Docker)

En el POS de mostrador **no se usa Docker**. El `.exe` de Electron levanta procesos locales en `127.0.0.1`:

```text
PointOfSale.exe (Electron)
  |-- spawnea pos-api (NestJS embebido)     -> :3001
  |-- spawnea afip-service.exe (sidecar)    -> :5086
  '-- carga la UI React

pos-api --HTTP--> http://127.0.0.1:5086/api/afipws/facturador
```

## Desarrollo vs produccion

| Entorno | AFIP | Como |
|---|---|---|
| Dev (programadores) | Docker | `npm run dev:afip` |
| Dev (probar sidecar) | `.exe` local | `npm run build:afip-sidecar` + `SPAWN_AFIP_SIDECAR=true` |
| Produccion (caja) | Sidecar empaquetado | Electron spawnea `afip-service.exe` automaticamente |

## Certificados en el POS

Colocar en `%APPDATA%/PointOfSale/afip/`:

- `user.crt`
- `user.key`

El sidecar los lee al iniciar. No van dentro del instalador.

## Build del sidecar (Windows)

Requisitos: Python 3.11, repo clonado, PyInstaller.

```powershell
cd services/afip
./build-sidecar.ps1
```

Genera: `services/afip/dist/afip-service.exe`

## Build del instalador con fiscal

```powershell
npm run build:afip-sidecar
npm run dist:win:fiscal
```

Sin sidecar (POS sin facturacion local):

```powershell
npm run dist:win
```

## Variables utiles (Electron)

| Variable | Default | Uso |
|---|---|---|
| `SPAWN_AFIP_SIDECAR` | `true` empaquetado | Forzar/no spawn del sidecar |
| `AFIP_SIDECAR_PATH` | auto | Ruta manual al `.exe` |
| `AFIP_PORT` | `5086` | Puerto local del motor AFIP |
| `AFIP_PRODUCTION` | `FALSE` | Homologacion / produccion |
