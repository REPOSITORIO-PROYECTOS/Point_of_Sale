# Remote Portal PWA (`apps/remote-portal`)

PWA de **administración remota** para supervisar cajas POS conectadas al relay en `services/remote/`.

## Desarrollo local

Desde la raíz del monorepo:

```powershell
npm run dev:remote
```

- Portal: http://localhost:5174
- Relay API (proxy `/api`): http://127.0.0.1:5090

Login dev: número de cliente `CLI-00001`, contraseña vacía. También podés elegir un cliente de la lista si el relay está corriendo.

## Flujo manual de prueba

1. **Relay + portal:** `npm run dev:remote` desde la raíz.
2. **Login:** http://localhost:5174/login — ingresá `CLI-00001` o elegí de la lista.
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
| **Cloudflare Pages** | Igual; configurar env `VITE_REMOTE_API_URL` al relay público |

El relay (API + WebSocket) **no** va en Vercel/Cloudflare Pages — desplegar `services/remote/` en VPS/Railway/Fly.io.

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
