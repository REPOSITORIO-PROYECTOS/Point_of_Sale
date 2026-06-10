# Arquitectura (referencia IA)

## Diagrama

```text
                    DESARROLLO                         PRODUCCIÓN (.exe)
                    ----------                         ----------------

  Browser/Electron          Docker                         Electron empaquetado
        |                      |                                    |
        v                      v                                    v
  frontend :5173          afip :5086                    UI file:// + node.exe
        |                      ^                                    |
        | (proxy /api)         | HTTP                               v
        v                      |                              pos-api :3001
  backend :3001 ----------------+                                    |
        |                                                            |
        v                                                            v
  SQLite (backend/storage)                              SQLite (%APPDATA%/PointOfSale)
```

## Responsabilidades por carpeta

| Carpeta | Tecnología | Responsabilidad |
|---------|------------|-----------------|
| `frontend/` | React, Vite, Tailwind | UI POS; proxy `/api` → `:3001` en dev |
| `backend/` | NestJS, TypeORM, SQLite | Productos, ventas, caja, inventario; **cliente HTTP AFIP** |
| `desktop/` | Electron, electron-builder | Empaqueta UI + backend (+ sidecar opcional) en `.exe` |
| `services/afip/` | Dockerfile, scripts | **Solo deploy** del microservicio Python (no código fuente) |
| Raíz `package.json` | concurrently | Orquestación: `dev:stack`, `dist:win`, etc. |

## Microservicio AFIP

- **Código:** https://github.com/REPOSITORIO-PROYECTOS/servicio_afip
- **En este repo:** `services/afip/Dockerfile` clona upstream al build
- **Puerto host:** `5086` → container `8002`
- **Contrato:** pos-api → `POST /api/afipws/facturador` con `credenciales` + `datos_factura`
- **backend NO contiene:** pyafipws, SOAP, certificados embebidos

## Puertos fijos (default)

| Puerto | Servicio |
|--------|----------|
| 5173 | Vite frontend |
| 3001 | NestJS pos-api |
| 5086 | servicio_afip (host) |

## Scripts raíz (package.json)

| Script | Efecto |
|--------|--------|
| `dev:stack` | web + api + afip |
| `dev:web` | solo frontend |
| `dev:api` | solo backend watch |
| `dev:afip` | solo Docker AFIP |
| `dev:desktop` | Electron → localhost:5173 |
| `build:all` | build web + api + desktop ts |
| `dist:win` | instalador sin AFIP sidecar |
| `dist:win:fiscal` | instalador con `afip-service.exe` |
