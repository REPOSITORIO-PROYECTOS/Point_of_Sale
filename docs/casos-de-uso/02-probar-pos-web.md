# Caso 02 — Probar POS en navegador (web)

**Objetivo:** Ver la UI sin Electron ni instalador.

## Pasos

```powershell
# Terminal 1 — API (recomendado para proxy /api)
npm run dev:api

# Terminal 2 — UI
npm run dev:web
```

Abrir: http://localhost:5173

## Solo UI (sin backend)

```powershell
npm run dev:web
```

La UI usa **mocks** (`frontend/src/lib/wails-bridge.ts`) si la API no está conectada.

## Health check API (opcional)

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api
```

## Notas

- Vite proxyea `/api` → `http://127.0.0.1:3001` (ver `frontend/vite.config.ts`).
- AFIP no es necesario para ver pantallas; sí para facturación real.

→ Facturación: [04-facturacion-afip-dev.md](./04-facturacion-afip-dev.md)
