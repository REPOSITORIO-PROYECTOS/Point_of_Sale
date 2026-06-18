# Licenciamiento POS

Control de activación y bloqueo cuando no hay licencia válida o se detecta uso indebido.

## Formato de licencia (Ed25519)

```
POS.<payloadBase64url>.<signatureBase64url>
```

El payload JSON firmado incluye:

| Campo | Descripción |
|-------|-------------|
| `licenseId` | Identificador de licencia (ej. `CLI-00042`) |
| `clientNumber` | Número de cliente (Sprint 7 remoto) |
| `machineId` | Hash de identidad de la máquina instalada |
| `issuedAt` / `expiresAt` | Vigencia |
| `features` | Módulos habilitados (`pos`, `afip`, `remote`) |

La verificación usa la **clave pública** embebida en el build (`backend/src/license/keys/license-public.pem`). La clave privada de firma vive solo en `tools/keys/` del equipo emisor — **nunca** en el repo del cliente.

### Generar licencia (equipo interno)

Usar herramienta interna con `LICENSE_PRIVATE_KEY_PATH` o ver `license-crypto.ts` (`signLicensePayload`).

### Desarrollo

Con `DEV_SKIP_LICENSE=true` en `backend/.env` (default en `.env.example`) el guard de licencia no bloquea la API.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DEV_SKIP_LICENSE` | `true` en dev para omitir enforcement |
| `LICENSE_PUBLIC_KEY_PATH` | Override de PEM público (opcional) |
| `LICENSE_PRIVATE_KEY_PATH` | Solo herramienta de emisión (no en runtime cliente) |

## Persistencia

Tabla SQLite `license_settings` (singleton `id=default`).

## API

```http
GET /api/license/machine-id    # ID para emitir licencia
GET /api/license/status        # Estado + gracia / avisos
POST /api/license/activate     # { "licenseKey": "POS...." }
```

## Comportamiento de bloqueo

| Situación | Backend | Frontend |
|-----------|---------|----------|
| Primeros 7 días sin licencia | API permitida (gracia) | Banner azul |
| Post-gracia sin licencia | **402** `LICENSE_INVALID` | `LicenseRequiredView` |
| Licencia inválida / expirada / otra máquina | **402** | Pantalla de activación |
| 7 días antes de `expiresAt` | API normal | Banner ámbar |

Rutas exentas: `@PublicRoute()`, `@LicenseExempt()` (`/license/*`, `/support/recovery/*`).

## Detección de uso indebido (MVP)

50 intentos fallidos de login / IP / hora → `cautionFlag` + audit `license.misuse.caution` (no bloqueo automático).

## Recuperación de soporte

Ver [`support-recovery.md`](support-recovery.md) — también exento de licencia.
