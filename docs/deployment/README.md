# Despliegue e instalador

Build del `.exe` y despliegue en mostrador.

## Documentos

| Doc | Descripción |
|-----|-------------|
| [../casos-de-uso/05-build-instalador.md](../casos-de-uso/05-build-instalador.md) | Generar `.exe` local |
| [../casos-de-uso/06-desplegar-caja.md](../casos-de-uso/06-desplegar-caja.md) | Producción mostrador |
| [../casos-de-uso/07-despliegue-linux-staging.md](../casos-de-uso/07-despliegue-linux-staging.md) | Staging Linux web (2 locales) |
| [../ai/build-and-deploy.md](../ai/build-and-deploy.md) | Detalle técnico (IA) |
| [../../services/afip/PRODUCTION.md](../../services/afip/PRODUCTION.md) | Sidecar AFIP producción |
| [../../desktop/README.md](../../desktop/README.md) | Electron / electron-builder |

## Comandos clave

```powershell
npm run dist:win           # POS sin AFIP embebido
npm run dist:win:fiscal    # POS + afip-service.exe
```

Staging web en Linux (2 locales):

```bash
npm run build:web
docker compose -f docker-compose.staging.yml --env-file deploy/staging/.env up -d --build
```

Salida: `desktop/release/` (gitignored).

## No confundir

- **Dev:** `npm run dev:stack` — no requiere build `.exe`
- **Instalador:** solo cuando hay que probar empaquetado o entregar a caja
