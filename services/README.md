# Servicios externos (`services/`)

Carpeta para **microservicios que corren aparte** del backend NestJS.

## `services/afip/` — motor fiscal AFIP

| | |
|---|---|
| **Qué es** | Microservicio Python/Flask (`servicio_afip`) |
| **Código fuente** | Repo separado: https://github.com/REPOSITORIO-PROYECTOS/servicio_afip |
| **Qué hay acá** | Solo Dockerfile, script de sidecar y documentación de despliegue |
| **Puerto** | `5086` (host) |
| **Quién lo consume** | `backend/` vía HTTP (`AFIP_SERVICE_URL`) |

No es una app Node ni parte del frontend. Es un **proceso independiente** que se levanta con Docker (dev) o como `.exe` sidecar (producción).

Documentación: [`afip/README.md`](afip/README.md)
