# Caso 04 — Facturación AFIP en desarrollo

**Objetivo:** Tener el microservicio fiscal accesible en `:5086`.

## Opción A — Docker (recomendado)

```powershell
npm run dev:afip
# o stack completo:
npm run dev:stack
```

Verificar:

```powershell
Invoke-RestMethod http://127.0.0.1:5086/api/afipws/test
Invoke-RestMethod http://127.0.0.1:3001/api/integrations/afip/health
```

Swagger AFIP: http://127.0.0.1:5086/swagger/

## Certificados (emisión real)

Colocar en `services/afip/`:

- `user.crt`
- `user.key`

Descomentar volúmenes en `docker-compose.dev.yml` si aplica.

## Opción B — Sidecar `.exe` (sin Docker)

```powershell
npm run build:afip-sidecar
$env:SPAWN_AFIP_SIDECAR = 'true'
npm run dev:desktop
```

Genera: `services/afip/dist/afip-service.exe`

## Importante

- Código Python: repo **externo** [servicio_afip](https://github.com/REPOSITORIO-PROYECTOS/servicio_afip)
- `backend/` solo consume HTTP; **no** editar lógica fiscal ahí
- Detalle: [../afip/README.md](../afip/README.md)

## Producción

→ [06-desplegar-caja.md](./06-desplegar-caja.md)
