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

**Resultado esperado:** existe `backend/storage/database.sqlite` y la carpeta `backend/storage/branding/` (logo del negocio en disco).

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

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api
Invoke-RestMethod http://127.0.0.1:3001/api/integrations/afip/health
Invoke-RestMethod http://127.0.0.1:5086/afipws/test
```

> AFIP puede responder en `/afipws/test` aunque `/api/afipws/test` devuelva 404 según la versión del sidecar.

Swagger API: http://127.0.0.1:3001/api/docs  
Swagger AFIP: http://127.0.0.1:5086/swagger/

## 5. Tests

```powershell
# Unitarios (sin stack levantado)
npm run test:microservices:unit

# Smoke REST (requiere pos-api en :3001)
npm run dev:api
npm run test:api:smoke

# AFIP import real (opcional, credenciales en env)
# $env:RUN_AFIP_IMPORT_TEST='true'
# $env:AFIP_TEST_CUIT='...'; $env:AFIP_TEST_CERT='...'; $env:AFIP_TEST_KEY='...'
# npm run test:api:smoke

# Integración pos-api + AFIP (stack recomendado)
npm run dev:stack
npm run test:microservices
```

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
