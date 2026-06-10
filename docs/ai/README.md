# Base de conocimiento para IA

Documentación orientada a **agentes** (Cursor, Copilot, etc.) para correr, depurar y desplegar el POS sin adivinar.

**Entrada principal:** [`AGENTS.md`](../../AGENTS.md) (raíz del repo)

## Archivos

| Archivo | Cuándo leerlo |
|---------|---------------|
| [dev-runbook.md](./dev-runbook.md) | Usuario pide correr en dev, probar, levantar servicios |
| [architecture.md](./architecture.md) | Entender capas, puertos, AFIP microservicio |
| [data-and-paths.md](./data-and-paths.md) | BD SQLite, AppData, qué no versionar |
| [build-and-deploy.md](./build-and-deploy.md) | Build `.exe`, sidecar AFIP, producción |

## Comando más usado en dev

```powershell
# Desde raíz Point_of_Sale/
npm run dev:stack
```

Requisitos: Node 20+, npm, Docker Desktop (para AFIP en dev).
