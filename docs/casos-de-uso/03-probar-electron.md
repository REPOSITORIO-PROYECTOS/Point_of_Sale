# Caso 03 — Probar con Electron

**Objetivo:** Abrir el POS en ventana de escritorio (dev), apuntando al Vite local.

## Pasos

```powershell
# Terminal 1 — stack completo
npm run dev:stack

# Terminal 2 — Electron
npm run dev:desktop
```

Electron carga `http://localhost:5173`.

## Sin AFIP

```powershell
npm run dev:web
npm run dev:api
npm run dev:desktop
```

## Con sidecar AFIP local (sin Docker)

```powershell
npm run build:afip-sidecar
$env:SPAWN_AFIP_SIDECAR = 'true'
npm run dev:desktop
```

(Requiere stack o al menos API corriendo.)

## Diferencia vs `.exe`

| Modo | UI | Backend |
|------|-----|---------|
| `dev:desktop` | Vite live `:5173` | `dev:api` separado |
| `.exe` empaquetado | `file://` embebido | spawn automático |

→ Build instalador: [05-build-instalador.md](./05-build-instalador.md)
