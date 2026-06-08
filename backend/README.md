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
- integrations/afip (health check + cliente HTTP al microservicio fiscal)

## Integracion AFIP

Variables en `.env`:

```env
AFIP_SERVICE_URL=http://127.0.0.1:5086
AFIP_PUNTO_VENTA=1
AFIP_PRODUCTION=false
```

Health check interno:

```text
GET /api/integrations/afip/health
```

El servicio AFIP corre aparte. Ver [`../services/afip/README.md`](../services/afip/README.md).

## Arquitectura microservicio

- **pos-api no contiene lógica fiscal AFIP** (sin pyafipws, sin SOAP).
- **pos-api solo consume HTTP** al microservicio Python en `AFIP_SERVICE_URL`.
- El contrato de facturación es multi-tenant:

```json
{
  "credenciales": { "cuit": "...", "certificado": "...", "clave_privada": "..." },
  "datos_factura": { "tipo_afip": 6, "punto_venta": 1, "...": "..." }
}
```

Certificados locales guardados en `%APPDATA%/PointOfSale/afip/`:

- `config.json` — CUIT, punto de venta, ambiente
- `user.crt` — certificado PEM
- `user.key` — clave privada PEM

### API de importación

```http
GET  /api/integrations/afip/config
POST /api/integrations/afip/credentials
```

Body de importación:

```json
{
  "cuit": "20123456789",
  "certificado": "-----BEGIN CERTIFICATE-----...",
  "clavePrivada": "-----BEGIN PRIVATE KEY-----...",
  "puntoVenta": 1,
  "production": false
}
```

También disponible desde la UI: **Configuración de Negocio → Certificados AFIP**.
