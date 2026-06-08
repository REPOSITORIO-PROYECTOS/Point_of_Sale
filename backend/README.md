# Point of Sale Backend

Backend NestJS con SQLite local listo para persistir datos.

## Base de datos

- Motor: SQLite
- Desarrollo por defecto: `backend/storage/database.sqlite`
- Produccion recomendada: `%APPDATA%/PointOfSale/database.sqlite` usando `APP_DATA_DIR`
- Directorios auxiliares: `storage/uploads` y `storage/logs` o la ruta definida en `APP_DATA_DIR`
- Inicializacion: `npm run db:init`
- Override opcional: `APP_DATA_DIR` o `SQLITE_DB_PATH`

## Escritorio

- Escucha por defecto en `127.0.0.1` para no exponer el backend en red local
- Acepta origenes locales tipicos de escritorio como `file://`, `null`, `localhost` y `127.0.0.1`
- Activa pragmas SQLite utiles para escritorio: `WAL`, `foreign_keys` y `busy_timeout`
- Permite apagar Swagger con `ENABLE_SWAGGER=false` en builds de produccion

## Modulos activos

- auth
- products
- sales
- inventory
- cash
