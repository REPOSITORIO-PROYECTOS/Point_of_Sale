# Datos y persistencia

SQLite, AppData y archivos sensibles.

## Documento principal

[../ai/data-and-paths.md](../ai/data-and-paths.md)

## Resumen

| Entorno | BD | Init |
|---------|-----|------|
| Dev | `backend/storage/database.sqlite` | `cd backend && npm run db:init` |
| `.exe` / caja | `%APPDATA%\PointOfSale\database.sqlite` | `APP_DATA_DIR` + `db:init` |

## AppData (producción)

```text
%APPDATA%\PointOfSale\
├── database.sqlite
├── uploads/
├── logs/
└── afip/          ← certificados (no en instalador)
```

## No versionar

`.env`, certificados, `database.sqlite`, `desktop/release/`, `node.exe` embebido.
