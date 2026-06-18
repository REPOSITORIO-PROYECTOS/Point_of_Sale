# Remote Portal PWA (`apps/remote-portal`)

PWA de **administración remota** para supervisar cajas POS conectadas al relay en `services/remote/`.

## Desarrollo local

Desde la raíz del monorepo:

```powershell
npm run dev:remote
```

- Portal: http://localhost:5174
- Relay API (proxy `/api`): http://127.0.0.1:5090

Login dev: número de cliente `CLI-00001`, contraseña vacía.

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

## Pantallas MVP

- Login (stub dev)
- Dashboard de cajas con badge online/offline
- Detalle de caja (snapshot mock + agente)
- Asignar cajas visibles al usuario portal
- Confirmar código de emparejamiento

Ver arquitectura: [`docs/ai/remote-connectivity-architecture.md`](../../docs/ai/remote-connectivity-architecture.md)
