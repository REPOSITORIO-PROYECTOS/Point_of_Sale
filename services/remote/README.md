# Microservicio Remote Relay (`services/remote`)

Hub de **conectividad remota** para el POS: emparejamiento de cajas, WebSocket, snapshots y API para el portal PWA.

## Estado

**Pre-implementación** — solo documentación. Ver diseño completo en [`docs/ai/remote-connectivity-architecture.md`](../../docs/ai/remote-connectivity-architecture.md).

## Qué hay (previsto)

| Pieza | Rol |
|-------|-----|
| `services/remote/` | Relay API + WebSocket (nube) |
| `apps/remote-portal/` | PWA administración móvil |
| `backend/src/remote-agent/` | Agente mínimo en pos-api (emparejamiento, heartbeat, push) |

## Arquitectura (resumen)

```text
POS (.exe)                    Nube                         Admin móvil
──────────                    ────                         ───────────
pos-api :3001                 relay :5090                  PWA portal
  └─ remote-agent ──WSS/HTTPS──► PostgreSQL ◄──HTTPS───────┘
  └─ SQLite (local, nunca expuesto)
```

## Desarrollo (cuando exista implementación)

```powershell
# Desde la raíz del monorepo (futuro)
npm run dev:remote
npm run dev:portal

# Stack con POS + AFIP + remote (futuro)
npm run dev:stack:remote
```

## Puertos (propuestos)

| Puerto | Servicio |
|--------|----------|
| 5090 | Remote relay (host) |
| 5174 | Remote portal PWA (dev) |

## Variables de entorno (stub)

Copiar `.env.example` → `.env` cuando se agregue:

```text
DATABASE_URL=postgres://remote:remote@localhost:5432/remote_relay
JWT_SECRET=change-me
PORT=5090
CORS_ORIGINS=http://localhost:5174
```

## Producción

- Docker Compose en VPS (relay + PostgreSQL + Caddy TLS)
- PWA estático en Cloudflare Pages / Vercel apuntando a `https://relay.tu-dominio.com`

## No tocar

- `services/afip/` — dominio fiscal independiente
- SQLite del POS — solo el agente local lee la BD
