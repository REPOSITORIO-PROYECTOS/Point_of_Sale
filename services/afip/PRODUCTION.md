# AFIP sidecar — producción e instalador local

En el POS de mostrador **no se usa Docker**. El `.exe` de Electron levanta procesos locales en `127.0.0.1`:

```text
Point of Sale.exe (Electron)
  |-- spawnea pos-api (NestJS + node.exe embebido)  -> :3001
  |-- spawnea afip-service.exe (solo build fiscal)  -> :5086
  '-- carga UI React embebida

pos-api --HTTP--> http://127.0.0.1:5086/api/afipws/facturador --> AFIP/ARCA
```

Guía completa del monorepo (datos, build, despliegue): [`../../README.md`](../../README.md)

## Desarrollo vs instalador local vs producción

| Escenario | AFIP | Comando |
|---|---|---|
| Dev (programadores) | Docker | `npm run dev:afip` |
| Dev (probar sidecar) | `.exe` local | `npm run build:afip-sidecar` + `$env:SPAWN_AFIP_SIDECAR='true'` |
| Instalador local (probar en tu PC) | Opcional | `npm run dist:win` (sin AFIP) o `dist:win:fiscal` (con AFIP) |
| Producción (caja registradora) | Sidecar embebido | Instalar `.exe` de `dist:win:fiscal` |

## Datos y certificados (no van en el instalador)

Todo lo sensible vive en `%APPDATA%\PointOfSale\`:

```text
%APPDATA%\PointOfSale\
├── database.sqlite       # datos del POS (ver backend db:init)
├── afip/
│   ├── user.crt          # certificado AFIP (PEM)
│   ├── user.key          # clave privada (PEM)
│   └── config.json       # CUIT, punto de venta (opcional, vía API)
├── uploads/
└── logs/
```

El sidecar lee `user.crt` y `user.key` al iniciar. **No** se empaquetan dentro del `.exe` por seguridad.

Inicializar BD del POS antes del primer uso del instalador:

```powershell
cd backend
$env:APP_DATA_DIR = "$env:APPDATA\PointOfSale"
npm run db:init
```

Importar credenciales vía API (alternativa a copiar archivos):

```http
POST /api/integrations/afip/credentials
```

## Build del sidecar (Windows)

Requisitos: Python 3.11, Git, PyInstaller (el script lo instala).

```powershell
npm run build:afip-sidecar
# Genera: services/afip/dist/afip-service.exe
# (clona https://github.com/REPOSITORIO-PROYECTOS/servicio_afip en source/)
```

## Build del instalador

POS **con** facturación local (producción / caja):

```powershell
npm run build:afip-sidecar
npm run dist:win:fiscal
```

POS **sin** facturación local (solo UI + API, AFIP externo o mock):

```powershell
npm run dist:win
```

Salida: `desktop/release/`

## Código fuente del microservicio

Este repo **no contiene** el código Python. Solo Dockerfile, script de sidecar y docs.

Código upstream: https://github.com/REPOSITORIO-PROYECTOS/servicio_afip

## Variables útiles (Electron / sidecar)

| Variable | Default | Uso |
|---|---|---|
| `SPAWN_AFIP_SIDECAR` | auto | `true` / `false` para forzar spawn |
| `AFIP_SIDECAR_PATH` | auto | Ruta manual a `afip-service.exe` |
| `AFIP_PORT` | `5086` | Puerto local del motor AFIP |
| `AFIP_PRODUCTION` | `FALSE` | `TRUE` para ambiente producción AFIP |
