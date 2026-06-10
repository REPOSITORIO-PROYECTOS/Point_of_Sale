# Arquitectura

Visión del sistema y responsabilidades por capa.

## Documentos

| Doc | Descripción |
|-----|-------------|
| [../ai/architecture.md](../ai/architecture.md) | Diagrama, puertos, scripts |
| [../../README.md](../../README.md) | Arquitectura resumida (raíz) |

## Capas

```text
frontend (React/Vite)  →  backend (NestJS/SQLite)  →  servicio_afip (Python)  →  AFIP/ARCA
desktop (Electron) empaqueta frontend + backend (+ sidecar AFIP opcional)
```

## Regla clave

El microservicio AFIP es **externo** al backend. Código Python: repo `servicio_afip`.  
En este monorepo: `services/afip/` = solo Docker/sidecar scripts.

→ [../afip/README.md](../afip/README.md)
