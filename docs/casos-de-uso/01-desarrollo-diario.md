# Caso 01 — Desarrollo diario

**Objetivo:** Levantar frontend + API + AFIP para trabajar en el código.

## Comando

Desde la raíz del repo:

```powershell
npm run dev:stack
```

| Servicio | URL |
|----------|-----|
| UI | http://localhost:5173 |
| API | http://127.0.0.1:3001/api |
| AFIP | http://127.0.0.1:5086/api/afipws/test |
| Swagger API | http://127.0.0.1:3001/api/docs |

**Requisito:** Docker Desktop encendido.

## Alternativa (terminales separadas)

```powershell
npm run dev:afip    # T1
npm run dev:api     # T2
npm run dev:web     # T3
```

## Dónde editar código

| Cambio | Carpeta |
|--------|---------|
| Pantallas, componentes | `frontend/src/` |
| API, reglas negocio | `backend/src/` |
| Ventana desktop | `desktop/src/` |
| Deploy AFIP | `services/afip/` |

## Datos

BD dev: `backend/storage/database.sqlite`  
Reinicializar: `cd backend && npm run db:init`

## Tests rápidos

```powershell
npm run test:microservices:unit
```

## Troubleshooting

| Problema | Solución |
|----------|----------|
| AFIP no levanta | Abrir Docker Desktop; `npm run dev:afip` solo |
| Puerto 3001 ocupado | Matar proceso o `$env:PORT=3010` en backend |
| EPERM en build | OneDrive bloqueando — pausar sync |

→ [Setup inicial](../getting-started/setup-inicial.md) si falta `node_modules` o BD.
