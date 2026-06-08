# servicio_afip (motor fiscal)

Microservicio Python/Flask para emisión de comprobantes electrónicos AFIP.

Repositorio upstream: https://github.com/REPOSITORIO-PROYECTOS/servicio_afip

## Setup local (opcional)

Si preferís trabajar sin Docker, cloná el código fuente en esta carpeta:

```powershell
cd services/afip
git clone https://github.com/REPOSITORIO-PROYECTOS/servicio_afip.git source
# Copiar archivos del clone a esta carpeta o trabajar desde source/
```

## Certificados AFIP

Colocá los certificados de homologación o producción en esta carpeta:

- `user.crt`
- `user.key`

**No commitear certificados ni `.env` con secretos.**

## Variables de entorno

Copiá `.env.example` a `.env` y completá al menos `CUIT`:

```powershell
copy .env.example .env
```

## Docker (recomendado en desarrollo)

Desde la raíz del monorepo:

```powershell
docker compose -f docker-compose.dev.yml up afip
```

Verificación:

```powershell
curl http://127.0.0.1:5086/api/afipws/test
```

Swagger: http://127.0.0.1:5086/swagger/

### Certificados en Docker

Para emisión real, colocá `user.crt` y `user.key` en esta carpeta y descomentá los volúmenes en `docker-compose.dev.yml`:

```yaml
volumes:
  - ./services/afip/user.crt:/app/user.crt:ro
  - ./services/afip/user.key:/app/user.key:ro
```

El endpoint `/api/afipws/test` puede responder sin certificados; la facturación los requiere.

## Puertos

| Contexto | URL |
|---|---|
| Host (dev) | `http://127.0.0.1:5086` |
| Red Docker (pos-api → afip) | `http://afip:8002` |

Gunicorn escucha en `8002` dentro del contenedor; se expone como `5086` en el host.

## Produccion (POS / .exe)

Docker **no** se usa en la caja registradora. Ver [`PRODUCTION.md`](PRODUCTION.md).
