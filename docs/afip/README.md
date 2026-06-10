# Integración AFIP

Microservicio fiscal Python, separado del backend NestJS.

## Documentos

| Doc | Descripción |
|-----|-------------|
| [../casos-de-uso/04-facturacion-afip-dev.md](../casos-de-uso/04-facturacion-afip-dev.md) | AFIP en dev |
| [../casos-de-uso/06-desplegar-caja.md](../casos-de-uso/06-desplegar-caja.md) | AFIP en producción |
| [../../services/afip/README.md](../../services/afip/README.md) | Docker, puertos, setup |
| [../../services/afip/PRODUCTION.md](../../services/afip/PRODUCTION.md) | Sidecar, certificados |
| [../../services/README.md](../../services/README.md) | Índice servicios externos |

## Código fuente (repo externo)

https://github.com/REPOSITORIO-PROYECTOS/servicio_afip

Este repo solo tiene:

- `services/afip/Dockerfile`
- `services/afip/build-sidecar.ps1`
- docs y `.env.example`

## Puertos

| Contexto | URL |
|----------|-----|
| Host (dev/sidecar) | http://127.0.0.1:5086 |
| Docker interno | http://afip:8002 |

## backend → AFIP

`GET /api/integrations/afip/health` (desde pos-api)  
`POST /api/afipws/facturador` (microservicio directo)
