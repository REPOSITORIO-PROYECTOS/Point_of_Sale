# Datos y rutas

## SQLite

| Entorno | Variable | Ruta default |
|---------|----------|--------------|
| Dev backend | — | `backend/storage/database.sqlite` |
| Desktop / prod | `APP_DATA_DIR` | `%APPDATA%\PointOfSale\database.sqlite` |
| Override | `SQLITE_DB_PATH` | ruta absoluta custom |

### Inicializar esquema

```powershell
# Dev
cd backend
npm run db:init

# Antes de probar .exe empaquetado
cd backend
$env:APP_DATA_DIR = "$env:APPDATA\PointOfSale"
npm run db:init
```

Script: `backend/src/database/init-db.ts` vía `npm run db:init`.

## AppData en producción / Electron

```text
%APPDATA%\PointOfSale\
├── database.sqlite
├── uploads/
├── logs/
└── afip/
    ├── user.crt      # certificado PEM (NO en git)
    ├── user.key      # clave privada (NO en git)
    └── config.json   # CUIT, punto venta (opcional)
```

Electron setea `APP_DATA_DIR` al spawnear pos-api (`desktop/src/local-services.ts`).

## Certificados AFIP

| Uso | Ubicación dev | Ubicación prod |
|-----|---------------|----------------|
| Docker AFIP | `services/afip/user.crt` + `.key` (montar en compose) | — |
| Sidecar / `.exe` | `%APPDATA%\PointOfSale\afip\` | igual |
| Import API | `POST /api/integrations/afip/credentials` | igual |

## Archivos que NUNCA commitear

- `backend/.env`
- `**/*.crt`, `**/*.key`, `**/*.pem` (certificados reales)
- `backend/storage/` (BD dev)
- `desktop/release/`
- `desktop/resources/nodejs/node.exe`
- `services/afip/source/`, `services/afip/dist/`
- `node_modules/`

Templates sí: `backend/.env.example`, `services/afip/.env.example`

## Frontend y datos

Hoy la UI en dev usa **mocks** (`frontend/src/lib/wails-bridge.ts`). La API en `:3001` existe pero no todos los flujos UI están conectados por REST todavía.
