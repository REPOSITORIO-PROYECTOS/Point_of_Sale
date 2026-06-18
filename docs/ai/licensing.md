# Sistema de licencias POS

Documentación del flujo de licenciamiento con firma asimétrica Ed25519 y vínculo a máquina.

**Última actualización:** 2026-06-18

---

## Resumen

| Rol | Qué hace |
|-----|----------|
| **Cliente (POS)** | Copia su ID de máquina, lo envía a soporte, pega la licencia recibida |
| **Equipo de desarrollo** | Genera licencias firmadas con la clave privada (solo en máquinas del equipo) |
| **Backend (POS instalado)** | Verifica firma con clave pública embebida y comprueba que el `machineId` coincida |

---

## Flujo de activación

```text
1. Cliente abre el POS
2. GET /api/license/status → allowed=false → pantalla "Activar licencia"
3. Cliente copia machineId (GET /api/license/machine-id)
4. Cliente envía machineId al equipo de soporte (email, ticket, etc.)
5. Equipo genera licencia vinculada a ese machineId
6. Cliente pega la clave POS-LIC-v1... en la UI
7. POST /api/license/activate → guarda en SQLite → allowed=true
```

---

## ¿Por qué está atada a la máquina?

- Evita que una misma licencia se copie a múltiples equipos sin autorización.
- El `machineId` es un **hash SHA-256** de identificadores estables (en Windows: `MachineGuid` del registro; fallback: hostname + MAC + plataforma).
- No se expone el serial de hardware en crudo al cliente ni en la API.

---

## Formato de licencia

```text
POS-LIC-v1.{base64url(payload)}.{base64url(firma-ed25519)}
```

Payload JSON (orden canónico al firmar):

```json
{
  "v": 1,
  "licenseId": "CLI-00042",
  "clientNumber": "00042",
  "machineId": "<sha256 fingerprint>",
  "issuedAt": "2026-06-18T12:00:00.000Z",
  "expiresAt": "2027-12-31T23:59:59.999Z",
  "features": ["afip", "pos", "remote"]
}
```

Mensajes de error habituales:

| Situación | Mensaje |
|-----------|---------|
| Firma inválida | Licencia no emitida por el proveedor |
| Otra máquina | Licencia no válida para esta máquina |
| Vencida | Licencia expirada |

---

## Generar licencias (equipo interno)

### Script CLI (recomendado)

Desde la raíz del repo, con la clave privada en `tools/keys/license-private.pem` (gitignored):

```powershell
node tools/generate-license.mjs `
  --client 00042 `
  --license-id CLI-00042 `
  --machine-id <sha256-del-pos-del-cliente> `
  --expires 2027-12-31
```

La licencia se imprime en stdout (`POS-LIC-v1...`).

Opciones:

| Flag | Descripción |
|------|-------------|
| `--client` | Número de cliente |
| `--license-id` | ID único de licencia (ej. `CLI-00042`) |
| `--machine-id` | Hash SHA-256 devuelto por `GET /api/license/machine-id` |
| `--expires` | Fecha `YYYY-MM-DD` (opcional; omitir = sin vencimiento) |
| `--features` | Lista separada por comas: `pos,afip,remote` |
| `--private-key` | Ruta PEM alternativa |

### Generación remota (soporte)

Si `SUPPORT_RECOVERY_SECRET` está configurado (mín. 32 caracteres), el endpoint de recuperación permite emitir licencias durante una llamada de soporte:

```http
POST /api/support/recovery/generate-license
X-Support-Recovery-Key: <clave-configurada>
Content-Type: application/json

{
  "client": "00042",
  "licenseId": "CLI-00042",
  "machineId": "<sha256>",
  "expires": "2027-12-31"
}
```

Requiere la clave privada accesible en el backend (`LICENSE_PRIVATE_KEY_PATH` o ruta por defecto `tools/keys/license-private.pem` relativa al cwd).

---

## Claves criptográficas

| Archivo | Ubicación | En repo |
|---------|-----------|---------|
| Clave pública | `backend/src/license/keys/license-public.pem` | ✅ Sí |
| Clave privada | `tools/keys/license-private.pem` | ❌ No (gitignored) |

**Producción:** solo la clave pública viaja en el build del cliente. La privada permanece en máquinas del equipo generador.

### Rotar claves

1. Generar nuevo par Ed25519 (`node -e "..."` o `openssl genpkey -algorithm ed25519`).
2. Reemplazar `license-public.pem` en el backend (nuevo release del POS).
3. Guardar nueva privada en `tools/keys/` en máquinas del equipo.
4. **Re-emitir todas las licencias** activas con la nueva clave (las firmadas con la clave anterior dejarán de validar).

---

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `DEV_SKIP_LICENSE=true` | Solo con `NODE_ENV=development`: omite validación (ver `.env.example`) |
| `LICENSE_PUBLIC_KEY_PATH` | Ruta PEM pública (opcional) |
| `LICENSE_PRIVATE_KEY_PATH` | Ruta PEM privada para generación remota en backend |
| `SUPPORT_RECOVERY_SECRET` | Habilita endpoints de recuperación + `generate-license` |

**Nunca commitear** la clave privada ni `SUPPORT_RECOVERY_SECRET` de producción.

---

## Validación en runtime

- `LicenseGuard` global: bloquea rutas protegidas si la licencia no es válida (HTTP 402 con `LICENSE_INVALID`).
- Rutas públicas de licencia y soporte usan `@LicenseExempt()`.
- Re-validación en memoria cada **1 hora** (firma + máquina + expiración).
- Licencia persistida en tabla `license_settings` (SQLite).

---

## Desarrollo local

En `backend/.env`:

```env
NODE_ENV=development
DEV_SKIP_LICENSE=true
```

Con esto el stack dev funciona sin activar licencia. Para probar el flujo completo, poner `DEV_SKIP_LICENSE=false` y usar el script generador.

---

## Tests

```powershell
cd backend
npm run test:microservices
```

Cubre en `license-crypto.test.ts`:

- Firma + verificación roundtrip
- Rechazo por `machineId` incorrecto
- Rechazo por payload alterado
- Rechazo por licencia falsificada / mal formada
