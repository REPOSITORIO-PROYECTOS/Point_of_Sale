# Desarrollo

Referencia para correr y depurar el POS en modo desarrollo.

## Documentos

| Doc | Descripción |
|-----|-------------|
| [../casos-de-uso/01-desarrollo-diario.md](../casos-de-uso/01-desarrollo-diario.md) | Flujo diario (humano) |
| [../ai/dev-runbook.md](../ai/dev-runbook.md) | Runbook completo (agentes IA) |
| [../casos-de-uso/02-probar-pos-web.md](../casos-de-uso/02-probar-pos-web.md) | Solo navegador |
| [../casos-de-uso/03-probar-electron.md](../casos-de-uso/03-probar-electron.md) | Electron dev |

## Scripts (desde raíz)

| Comando | Descripción |
|---------|-------------|
| `npm run dev:stack` | Frontend + API + AFIP |
| `npm run dev:web` | Solo Vite `:5173` |
| `npm run dev:api` | Solo Nest `:3001` |
| `npm run dev:afip` | Solo Docker AFIP `:5086` |
| `npm run dev:desktop` | Electron → localhost:5173 |

## README por app

- [../../frontend/README.md](../../frontend/README.md)
- [../../backend/README.md](../../backend/README.md)
- [../../desktop/README.md](../../desktop/README.md)
