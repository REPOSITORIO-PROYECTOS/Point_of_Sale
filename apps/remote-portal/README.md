# Remote Portal PWA (`apps/remote-portal`)

PWA de **administración remota** para supervisar cajas POS conectadas al relay en `services/remote/`.

## Desarrollo local

Desde la raíz del monorepo:

```powershell
npm run dev:remote
```

- Portal: http://localhost:5174
- Relay API (proxy `/api`): http://127.0.0.1:5090

Login dev (relay con `SEED_DEMO` activo): `developer@pos.local` / `dev1234` o cliente demo `demo@pos.local` / `demo1234`.

## Flujo manual de prueba

1. **Relay + portal:** `npm run dev:remote` desde la raíz.
2. **Login:** http://localhost:5174/login — `developer@pos.local` / `dev1234` (dev) o registrá un cliente nuevo.
3. **Clientes:** http://localhost:5174/clients — crear cliente (`CLI-00042`, nombre, email opcional) y asignar caja.
4. **Dashboard:** http://localhost:5174/ — tarjetas por caja con 🟢/🔴, ventas hoy y estado de caja.
5. **Detalle caja:** click en una caja → `/clients/:clientNumber/registers/:registerId` — sesión, ventas, stock, licencia, heartbeats.
6. **Emparejar:** http://localhost:5174/pairing — confirmar código del POS.
7. **Agente POS (opcional):** con `REMOTE_ENABLED=true` en backend y relay activo, emparejar vía `POST /api/remote/pair` y ver snapshots reales desde SQLite.

Verificar relay:

```powershell
curl http://127.0.0.1:5090/health
curl http://127.0.0.1:5090/admin/tenants
curl http://127.0.0.1:5090/tenants/CLI-00001
```

## Variables de entorno

Copiar `.env.example` → `.env` (opcional en dev; Vite usa proxy):

```text
VITE_REMOTE_API_URL=https://relay.tu-dominio.com
VITE_REMOTE_WS_URL=wss://relay.tu-dominio.com
```

En dev, omití `VITE_REMOTE_API_URL` para usar el proxy `/api` → `:5090`.

## Build producción

Desde la raíz del monorepo:

```powershell
npm run build:portal
```

O desde esta carpeta:

```powershell
cd apps/remote-portal
npm install
npm run build
```

El output queda en `apps/remote-portal/dist/`.

## Deploy estático

| Host | Pasos |
|------|-------|
| **Vercel** | Root `apps/remote-portal`, build `npm run build`, output `dist` |
| **Cloudflare Pages** | Igual; `public/_redirects` incluye fallback SPA |
| **nginx** | `root dist/; try_files $uri $uri/ /index.html;` |

Variables de build (obligatorias en producción):

```text
VITE_REMOTE_API_URL=https://relay.tu-dominio.com
```

El WebSocket se deriva de esa URL (`https` → `wss`). Solo definí `VITE_REMOTE_WS_URL` si el WS va a otro host.

El relay (API + WebSocket) **no** va en Vercel/Cloudflare Pages — desplegar `services/remote/` en VPS:

```powershell
cp services/remote/.env.example services/remote/.env
# editar DEV_PORTAL_EMAIL, DEV_PORTAL_PASSWORD, CORS_ORIGINS
docker compose -f docker-compose.remote.yml up -d --build
```

Ver [`services/remote/Caddyfile.example`](../../services/remote/Caddyfile.example) para TLS.

## Pantallas

| Ruta | Descripción |
|------|-------------|
| `/login` | Número de cliente o selector de lista |
| `/` | Dashboard con resumen por caja |
| `/clients` | Listado, crear cliente, asignar caja |
| `/clients/:clientNumber/registers/:registerId` | Detalle completo de caja |
| `/pairing` | Confirmar emparejamiento POS |

Navegación: **Dashboard · Clientes · Emparejar**

Ver arquitectura: [`docs/ai/remote-connectivity-architecture.md`](../../docs/ai/remote-connectivity-architecture.md)
