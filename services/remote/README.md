# Microservicio Remote Relay (`services/remote`)

Hub de **conectividad remota** para el POS: emparejamiento de cajas, WebSocket, snapshots enriquecidos y API para el portal PWA.

## Estado

**MVP enriquecido** — relay in-memory + WebSocket + snapshots con sesión de caja, ventas del día, stock y licencia. Ver [`docs/ai/remote-connectivity-architecture.md`](../../docs/ai/remote-connectivity-architecture.md).

## Qué incluye

| Pieza | Rol |
|-------|-----|
| `services/remote/` | Relay API + WebSocket (nube) — **este servicio** |
| `apps/remote-portal/` | PWA administración móvil |
| `backend/src/integrations/remote/` | Agente en pos-api (lee SQLite, push snapshot) |

## Arquitectura (resumen)

```text
POS (.exe)                    Nube                         Admin móvil
──────────                    ────                         ───────────
pos-api :3001                 relay :5090                  PWA :5174
  └─ remote-agent ──WSS/HTTPS──► in-memory/SQLite ◄──HTTPS─┘
  └─ SQLite (local, nunca expuesto)
```

## Desarrollo local

```powershell
# Desde la raíz del monorepo
npm run dev:remote-api     # solo relay
npm run dev:remote         # relay + portal PWA
npm run dev:stack:full     # POS + AFIP + relay + portal
```

Verificar:

```powershell
curl http://127.0.0.1:5090/health
curl http://127.0.0.1:5090/admin/tenants
curl http://127.0.0.1:5090/tenants/CLI-00001
curl http://127.0.0.1:5090/tenants/CLI-00001/registers/reg-id/snapshot
```

Tests:

```powershell
npm test --prefix services/remote
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/admin/tenants` | Listar clientes |
| POST | `/admin/tenants` | Crear cliente `{ clientNumber, name, contactEmail? }` |
| POST | `/admin/registers` | Registrar caja en tenant |
| POST | `/admin/assign-registers` | Asignar cajas a usuario portal |
| POST | `/pairing/request` | POS solicita código |
| POST | `/pairing/confirm` | Portal confirma código |
| POST | `/pairing/complete` | POS completa emparejamiento |
| GET | `/tenants/:clientNumber` | Detalle cliente + resumen cajas |
| GET | `/tenants/:clientNumber/registers` | Listar cajas con snapshot resumido |
| GET | `/tenants/:clientNumber/registers/:id/snapshot` | Snapshot enriquecido |
| WS | `/ws/agent?deviceToken=` | Agente POS (heartbeat + snapshot) |
| WS | `/ws/portal` | Portal suscrito a `tenant:{clientNumber}` |

### Snapshot enriquecido (por caja)

```typescript
{
  registerId, label, online, lastHeartbeatAt, lastSyncAt,
  cashSession: { open, openedAt?, openingBalance?, salesTotal?, expectedBalance? },
  salesToday: { count, total },
  stockAlerts: number,
  licenseStatus?: 'active' | 'grace' | 'invalid',
  agentVersion?: string,
  heartbeatHistory?: string[]  // últimos 5
}
```

El portal recibe `snapshot_update` por WebSocket en cada heartbeat/snapshot del agente.

## Variables de entorno

Copiar `.env.example` → `.env`:

```text
PORT=5090
HOST=127.0.0.1
CORS_ORIGINS=http://localhost:5174,http://127.0.0.1:5174
PAIRING_TTL_MINUTES=15
```

## Docker

```powershell
cd services/remote
docker build -t pos-remote-relay .
docker run --rm -p 5090:5090 -e CORS_ORIGINS=https://portal.tu-dominio.com pos-remote-relay
```

### Compose (snippet)

```yaml
services:
  remote-relay:
    build: ./services/remote
    ports:
      - "5090:5090"
    environment:
      PORT: 5090
      HOST: 0.0.0.0
      CORS_ORIGINS: https://portal.tu-dominio.com
```

Para producción MVP se recomienda VPS + PostgreSQL (fase posterior); el scaffold usa **memoria** reiniciada en cada deploy.

## Producción

- Relay: Docker en VPS (Railway/Fly.io/VPS) con TLS (Caddy)
- PWA: build estático en Cloudflare Pages / Vercel → `VITE_REMOTE_API_URL=https://relay.tu-dominio.com`

## No tocar

- `services/afip/` — dominio fiscal independiente
- SQLite del POS — solo el agente local lee la BD
