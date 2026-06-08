# Electron desktop shell

## Que corre en el POS (sin Docker)

El instalador `.exe` **no incluye Docker**. Al abrir la app:

1. Electron spawnea **pos-api** (NestJS) en `127.0.0.1:3001`
2. Electron spawnea **afip-service.exe** (si fue empaquetado) en `127.0.0.1:5086`
3. Carga la UI React

Si el sidecar AFIP no esta empaquetado, el POS sigue funcionando; la facturacion fiscal requiere AFIP accesible en `:5086`.

## Modo desarrollo

```powershell
# Stack web (Docker solo para AFIP en dev)
npm run dev:stack

# Electron (spawn backend + sidecar si existe)
npm run dev:desktop
```

Probar sidecar local sin Docker:

```powershell
npm run build:afip-sidecar
$env:SPAWN_AFIP_SIDECAR='true'
npm run dev:desktop
```

## Builds

| Comando | Resultado |
|---|---|
| `npm run dist:win` | Instalador POS sin sidecar AFIP |
| `npm run dist:win:fiscal` | Instalador POS + `afip-service.exe` embebido |

Ver [`../services/afip/PRODUCTION.md`](../services/afip/PRODUCTION.md) para certificados y sidecar.
