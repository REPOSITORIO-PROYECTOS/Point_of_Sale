# Modo de recuperación de soporte

Acceso controlado para el **equipo de programación** cuando no pueden intervenir en el local del cliente. No es un backdoor público: requiere un secreto configurado solo en el servidor.

## Principios de seguridad

- **Nunca** commitear `SUPPORT_RECOVERY_SECRET` ni compartirlo con clientes finales.
- **No** hay contraseñas hardcodeadas en el código fuente.
- Todas las acciones quedan registradas en el audit log (`support.recovery.*`).
- El flujo normal de login JWT **no** se bypassa para usuarios del negocio.

## Variables de entorno

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `SUPPORT_RECOVERY_SECRET` | Sí (prod soporte) | Mínimo 32 caracteres. Si no está definido, los endpoints devuelven **503**. |

Configurar en `backend/.env` (copiar desde `.env.example`). En producción/desktop, inyectar por instalador o gestor de secretos interno.

## API (con backend levantado)

Base: `http://127.0.0.1:3001/api`

### 1. Desbloquear sesión de recuperación

```http
POST /support/recovery/unlock
X-Support-Recovery-Key: <SUPPORT_RECOVERY_SECRET>
```

Respuesta: `recoveryToken` (válido 15 minutos).

### 2. Diagnóstico

```http
GET /support/recovery/diagnostics
X-Support-Recovery-Token: <recoveryToken>
```

Devuelve ruta de BD, estado de licencia, cantidad de usuarios (sin secretos).

### 3. Exportar datos

```http
GET /support/recovery/export
X-Support-Recovery-Token: <recoveryToken>
```

JSON con usuarios (sin passwords), productos, resumen de ventas y settings de tema. **No** incluye claves privadas AFIP.

Backup SQLite:

```http
GET /support/recovery/export?format=sqlite
X-Support-Recovery-Token: <recoveryToken>
```

### 4. Reset de administrador

```http
POST /support/recovery/reset-admin
X-Support-Recovery-Token: <recoveryToken>
Content-Type: application/json

{ "username": "admin", "password": "nueva-clave-segura" }
```

Solo si el cliente quedó bloqueado fuera del sistema.

## CLI offline (sin API)

Útil si el proceso Nest no arranca pero el archivo SQLite existe:

```powershell
$env:SUPPORT_RECOVERY_SECRET = "secreto-interno-minimo-32-chars"
npm run support:export --prefix backend
```

Genera copia de `database.sqlite` en `%APPDATA%\PointOfSale\support-exports\` (o `APP_DATA_DIR` configurado).

## Frontend (Electron / dev)

- **5 clics** en el pie `v0.0.1` o atajo **Ctrl+Shift+Alt+R**
- Solo visible en build Electron o `import.meta.env.DEV`
- Abre diálogo para ingresar clave → desbloqueo → diagnóstico / export JSON

## Códigos de error

| HTTP | Situación |
|------|-----------|
| 503 | `SUPPORT_RECOVERY_SECRET` no configurado |
| 401 | Clave o token de recuperación inválido |
| 200 | Operación exitosa |

## Quién puede usar esto

Solo personal autorizado de desarrollo/soporte interno. Documentar el secreto en el gestor de contraseñas del equipo, **no** en tickets visibles al cliente.
