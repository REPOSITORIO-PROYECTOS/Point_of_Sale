# Runbook — desarrollo

Ejecutar desde la **raíz** del monorepo salvo que se indique otra carpeta.

OS de referencia: **Windows / PowerShell**. En bash, adaptar `copy` → `cp` y variables de entorno.

## 1. Setup inicial (una vez por máquina)

```powershell
Set-Location "c:\Users\ticia\OneDrive\Sistemas\Point_of_Sale"

npm install
npm install --prefix frontend
npm install --prefix desktop

Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run db:init
Set-Location ..
```

**Resultado esperado:** existe `backend/storage/database.sqlite` y la carpeta `backend/storage/branding/` (logo del negocio en disco). El logo por defecto del sistema vive en `frontend/public/branding/default-logo.png` (servido como `/branding/default-logo.png` en dev).

Variables opcionales de soporte/licencia en `backend/.env` (ver [`support-recovery.md`](support-recovery.md) y [`licensing.md`](licensing.md)):

```powershell
# Solo equipo interno — NUNCA commitear valores reales
# SUPPORT_RECOVERY_SECRET=minimo-32-caracteres-secreto-interno
# LICENSE_SIGNING_SECRET=secreto-hmac-licencias
```

En desarrollo, licencia de prueba: `DEV-LICENSE-UNLIMITED` con cliente `DEV`.

### Primera ejecución de la app

Si la BD no tiene usuarios, la UI muestra **Configuración inicial** (`SetupView`) para crear el administrador una sola vez. No hay contraseña por defecto.

Para repetir el flujo en dev:

```powershell
Remove-Item backend/storage/database.sqlite -ErrorAction SilentlyContinue
cd backend; npm run db:init; cd ..
```

## 2. Levantar stack de desarrollo

### Opción A — Todo junto (recomendado)

```powershell
npm run dev:stack
```

Levanta en paralelo:

| Proceso | Script interno | URL |
|---------|----------------|-----|
| Frontend Vite | `npm run dev --prefix frontend` | http://localhost:5173 |
| Backend NestJS | `npm run start:dev --prefix backend` | http://127.0.0.1:3001/api |
| AFIP Docker | `docker compose -f docker-compose.dev.yml up afip` | http://127.0.0.1:5086 |

**Requisito:** Docker Desktop corriendo.

### Opción B — Terminales separadas

```powershell
# Terminal 1
npm run dev:afip

# Terminal 2
npm run dev:api

# Terminal 3
npm run dev:web
```

### Opción C — Solo UI + API (sin AFIP)

```powershell
npm run dev:web
npm run dev:api
```

## 3. Electron en desarrollo

```powershell
# Terminal 1
npm run dev:stack

# Terminal 2
npm run dev:desktop
```

Electron carga `http://localhost:5173`. El backend ya corre vía `dev:stack` (no hace falta spawn extra en dev desktop si el stack está up).

## 4. Verificación (health checks)

En la **primera apertura** de http://localhost:5173 con BD vacía, la UI pide crear el administrador (no hay usuario por defecto).

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api
Invoke-RestMethod http://127.0.0.1:3001/api/auth/setup-status
Invoke-RestMethod http://127.0.0.1:3001/api/integrations/afip/health
Invoke-RestMethod http://127.0.0.1:5086/afipws/test
```

> AFIP puede responder en `/afipws/test` aunque `/api/afipws/test` devuelva 404 según la versión del sidecar.

Swagger API: http://127.0.0.1:3001/api/docs  
Swagger AFIP: http://127.0.0.1:5086/swagger/

## 5. Tests

| Comando | Requiere API | Qué cubre |
|---------|--------------|-----------|
| `npm run test:microservices:unit` | No | Auth, AFIP, license, recovery, logo, receipt, users, parcels, roles guard |
| `npm run test:api:smoke` | Sí (`:3001`) | CRUD productos, ventas/caja, auth JWT, barcode, tema/logo, parcels, recovery |
| `npm run test:all` | Sí para smoke | Unit + smoke en secuencia |
| `npm run test:microservices` | Stack opcional | Script integración `verify-microservices.mjs` |

```powershell
# Unitarios (sin stack levantado)
npm run test:microservices:unit

# Smoke REST (requiere pos-api en :3001)
npm run dev:api
npm run test:api:smoke

# Unit + smoke (levantar API antes del smoke)
npm run dev:api
npm run test:all

# AFIP import real (opcional, credenciales en env)
# $env:RUN_AFIP_IMPORT_TEST='true'
# $env:AFIP_TEST_CUIT='...'; $env:AFIP_TEST_CERT='...'; $env:AFIP_TEST_KEY='...'
# npm run test:api:smoke

# Integración pos-api + AFIP (stack recomendado)
npm run dev:stack
npm run test:microservices
```

Credenciales smoke opcionales: `POS_TEST_USERNAME`, `POS_TEST_PASSWORD` (default `smoke-admin` / `smoke-test-pass-123` si la BD necesita setup).

Plan de sprints: [`sprint-revision.md`](sprint-revision.md)

## 6. Troubleshooting dev

| Problema | Acción |
|----------|--------|
| Puerto 3001 ocupado | `$env:PORT=3010` en backend; ajustar proxy en `frontend/vite.config.ts` si hace falta |
| Error migración tabla `sales` | `cd backend && npm run db:init` (dropea schema legacy y recrea) |
| AFIP no responde | Verificar Docker; `npm run dev:afip` solo |
| `EPERM` en `backend/dist` al build | OneDrive: pausar sync o build fuera del repo |
| UI sin datos reales | Verificar que `npm run dev:api` esté levantado; productos ya usan `PosAPI` |
| Falta React en frontend | `npm install --prefix frontend react@18.3.1 react-dom@18.3.1` |

## 7. Lo que NO hacer en dev

- No correr `npm run dist:win` para "probar rápido" — usar `dev:stack`.
- No editar `servicio_afip` dentro de este repo; es repo upstream clonado en build.
- No commitear `backend/.env`, certificados, ni `database.sqlite`.
