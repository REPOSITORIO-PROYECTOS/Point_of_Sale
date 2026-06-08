# Microservicio AFIP (`servicio_afip`)

Motor fiscal **Python/Flask** para emisión de comprobantes electrónicos AFIP/ARCA.

## Qué hay en este repo (Point_of_Sale)

Esta carpeta **no contiene el código del microservicio**. Solo guarda la **infraestructura de despliegue**:

| Archivo | Rol |
|---------|-----|
| `Dockerfile` | Clona `servicio_afip` al build y arma la imagen Docker |
| `build-sidecar.ps1` | Clona el repo y genera `afip-service.exe` (PyInstaller) |
| `.env.example` | Variables de entorno del contenedor |
| `PRODUCTION.md` | Sidecar en la caja registradora (sin Docker) |
| `.gitignore` | Excluye `source/`, certificados y `.env` |

**No se versionan** (generados en build local):

- `source/` — clone del repo upstream
- `dist/afip-service.exe` — ejecutable sidecar
- `user.crt`, `user.key` — certificados AFIP

## Dónde está el código del microservicio

Repositorio upstream (Python/Flask + pyafipws):

**https://github.com/REPOSITORIO-PROYECTOS/servicio_afip**

Se descarga automáticamente al:

- `docker compose build afip` (Dockerfile)
- `npm run build:afip-sidecar` (script PowerShell)

## Cómo encaja en la arquitectura

```text
frontend (:5173)  ──HTTP──>  backend/pos-api (:3001)  ──HTTP──>  servicio_afip (:5086)  ──SOAP──>  AFIP/ARCA
                                    │                              ▲
                                 SQLite                    microservicio aparte
                                                           (Python, no NestJS)
```

| Componente | Repo / carpeta | Responsabilidad |
|------------|----------------|-----------------|
| UI | `frontend/` | Pantallas del POS |
| API de negocio | `backend/` | Productos, ventas, caja; **cliente HTTP** a AFIP |
| Motor fiscal | `servicio_afip` (upstream) | pyafipws, SOAP, CAE, consultas AFIP |
| Despliegue AFIP | `services/afip/` (este repo) | Docker, sidecar `.exe`, docs |

**pos-api no tiene lógica fiscal.** Solo llama al microservicio en `AFIP_SERVICE_URL` (default `http://127.0.0.1:5086`).

Endpoints del microservicio (upstream):

- `GET /api/afipws/test` — health
- `POST /api/afipws/facturador` — emisión
- Swagger: `http://127.0.0.1:5086/swagger/`

Integración desde pos-api:

- `GET /api/integrations/afip/health`
- `GET /api/integrations/afip/config`
- `POST /api/integrations/afip/credentials`

Ver [`../backend/README.md`](../backend/README.md).

## Desarrollo (Docker, recomendado)

Desde la raíz del monorepo:

```powershell
npm run dev:afip
# o stack completo:
npm run dev:stack
```

Verificación:

```powershell
curl http://127.0.0.1:5086/api/afipws/test
curl http://127.0.0.1:3001/api/integrations/afip/health
```

### Certificados en Docker

Para emisión real, colocá `user.crt` y `user.key` en esta carpeta y descomentá los volúmenes en `docker-compose.dev.yml`:

```yaml
volumes:
  - ./services/afip/user.crt:/app/user.crt:ro
  - ./services/afip/user.key:/app/user.key:ro
```

`/api/afipws/test` puede responder sin certificados; la facturación los requiere.

## Puertos

| Contexto | URL |
|----------|-----|
| Host (dev / sidecar) | `http://127.0.0.1:5086` |
| Red Docker (pos-api → afip) | `http://afip:8002` |

Gunicorn escucha en `8002` dentro del contenedor; se expone como `5086` en el host.

## Producción (POS / .exe)

Docker **no** se usa en la caja registradora. Electron spawnea `afip-service.exe` localmente.

Ver [`PRODUCTION.md`](PRODUCTION.md).
