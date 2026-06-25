# Guía para agentes IA (Cursor / Copilot)

**Leer esto antes de correr, buildear o modificar el proyecto.**

Base de conocimiento detallada: [`docs/`](docs/) · [`docs/ai/`](docs/ai/) · [`docs/casos-de-uso/`](docs/casos-de-uso/)

## Qué es este repo

Monorepo POS: **frontend** (React/Vite) + **backend** (NestJS/SQLite) + **desktop** (Electron) + **services/afip** (solo deploy del microservicio Python AFIP).

| Carpeta | Rol | Puerto dev |
|---------|-----|------------|
| `frontend/` | UI | `5173` |
| `backend/` | API negocio | `3001` |
| `services/afip/` | Wrapper Docker/sidecar AFIP | `5086` |
| `desktop/` | Shell `.exe` | — |

**AFIP:** código Python en repo externo `servicio_afip`. `backend/` solo hace HTTP a `:5086`. **No** hay lógica fiscal en NestJS.

## Correr en desarrollo (comando preferido)

Desde la **raíz** del repo (`Point_of_Sale/`):

```powershell
# Setup primera vez (si falta node_modules o BD)
npm install
npm install --prefix frontend
cd backend; copy .env.example .env; npm install; npm run db:init; cd ..
npm install --prefix desktop

# Stack completo: frontend + API + AFIP (Docker)
npm run dev:stack
```

Verificar:

```powershell
curl http://127.0.0.1:3001/api
curl http://127.0.0.1:5086/api/afipws/test
# UI: http://localhost:5173
```

### Electron en dev (opcional)

```powershell
# Terminal 1
npm run dev:stack

# Terminal 2
npm run dev:desktop
```

### Sin Docker (solo UI + API)

```powershell
npm run dev:web    # :5173
npm run dev:api    # :3001
```

AFIP no estará disponible; `/api/integrations/afip/health` puede marcar AFIP unreachable (esperado).

## Datos (SQLite)

| Modo | Ruta BD |
|------|---------|
| Dev | `backend/storage/database.sqlite` |
| `.exe` / producción | `%APPDATA%\PointOfSale\database.sqlite` |

Inicializar dev: `cd backend && npm run db:init`

Inicializar antes de `.exe`: `$env:APP_DATA_DIR="$env:APPDATA\PointOfSale"; npm run db:init` (desde `backend/`)

**No commitear:** `.env`, certificados, `database.sqlite`, `desktop/release/`, `desktop/resources/nodejs/`

## Build `.exe` (no es dev)

Ver [`docs/ai/build-and-deploy.md`](docs/ai/build-and-deploy.md). Resumen:

- Requiere copiar `node.exe` → `desktop/resources/nodejs/`
- Salida de build: `desktop/release/` (gitignored)
- Frontend Electron necesita `base: './'` en `vite.config.ts`

## Reglas para el agente

0. **Cierre de sprint:** al terminar un lote de tareas, seguir [`.cursor/rules/sprint-revision-git.mdc`](.cursor/rules/sprint-revision-git.mdc) — revisar `git diff`, actualizar [`docs/ai/sprint-revision.md`](docs/ai/sprint-revision.md) y commitear por dominio.
1. **Dev:** usar scripts de la raíz (`npm run dev:stack`), no inventar orquestadores.
2. **No** mezclar código AFIP Python en `backend/` o `frontend/`.
3. **No** commitear secretos, `.exe`, `node_modules`, builds.
4. Cambios en UI → `frontend/`. API → `backend/`. Electron → `desktop/`. Deploy AFIP → `services/afip/`.
5. Si el usuario pide "probar el POS", preferir `npm run dev:stack` antes que build `.exe`.

## Índice docs

| Carpeta | Contenido |
|---------|-----------|
| [docs/README.md](docs/README.md) | **Índice maestro** |
| [docs/casos-de-uso/](docs/casos-de-uso/) | Guías por escenario (humanos) |
| [docs/ai/dev-runbook.md](docs/ai/dev-runbook.md) | Runbook dev (agentes) |
| [docs/ai/architecture.md](docs/ai/architecture.md) | Diagrama, puertos |
| [docs/ai/data-and-paths.md](docs/ai/data-and-paths.md) | SQLite, AppData |
| [docs/ai/build-and-deploy.md](docs/ai/build-and-deploy.md) | `.exe`, sidecar |

Humans: [`README.md`](README.md)
