# Documentación — Point of Sale

Índice maestro del monorepo. Elegí el escenario que necesitás.

## Casos de uso (empezá acá)

| Caso | Documento |
|------|-----------|
| Primera instalación en la PC | [getting-started/setup-inicial.md](./getting-started/setup-inicial.md) |
| Trabajar día a día (dev) | [casos-de-uso/01-desarrollo-diario.md](./casos-de-uso/01-desarrollo-diario.md) |
| Probar solo la UI en el navegador | [casos-de-uso/02-probar-pos-web.md](./casos-de-uso/02-probar-pos-web.md) |
| Probar con Electron (ventana desktop) | [casos-de-uso/03-probar-electron.md](./casos-de-uso/03-probar-electron.md) |
| Probar facturación AFIP en dev | [casos-de-uso/04-facturacion-afip-dev.md](./casos-de-uso/04-facturacion-afip-dev.md) |
| Generar el `.exe` instalador | [casos-de-uso/05-build-instalador.md](./casos-de-uso/05-build-instalador.md) |
| Desplegar en caja registradora | [casos-de-uso/06-desplegar-caja.md](./casos-de-uso/06-desplegar-caja.md) |

## Por tema

| Tema | Carpeta | Contenido |
|------|---------|-----------|
| Agentes IA / Cursor | [ai/](./ai/) · [AGENTS.md](../AGENTS.md) | Runbooks para que la IA corra dev sin adivinar |
| Desarrollo | [development/](./development/) | Comandos, puertos, Electron dev |
| Despliegue | [deployment/](./deployment/) | Build `.exe`, sidecar, producción |
| Arquitectura | [architecture/](./architecture/) | Capas, microservicios, diagramas |
| Datos | [data/](./data/) | SQLite, AppData, certificados |
| AFIP fiscal | [afip/](./afip/) | Microservicio Python, Docker, sidecar |

## Documentación por app (código)

| App | README |
|-----|--------|
| Monorepo (humano) | [../README.md](../README.md) |
| Frontend | [../frontend/README.md](../frontend/README.md) |
| Backend | [../backend/README.md](../backend/README.md) |
| Desktop / Electron | [../desktop/README.md](../desktop/README.md) |
| Deploy AFIP (Docker/sidecar) | [../services/afip/README.md](../services/afip/README.md) |
| AFIP producción | [../services/afip/PRODUCTION.md](../services/afip/PRODUCTION.md) |

## Mapa del repo

```text
docs/
├── README.md              ← este índice
├── casos-de-uso/          ← guías por escenario (humanos)
├── getting-started/       ← setup primera vez
├── development/           ← referencia dev
├── deployment/            ← build e instalador
├── architecture/          ← diseño del sistema
├── data/                  ← persistencia SQLite / AppData
├── afip/                  ← integración fiscal
└── ai/                    ← base conocimiento agentes IA
```

## Puertos (referencia rápida)

| Puerto | Servicio |
|--------|----------|
| 5173 | Frontend Vite |
| 3001 | Backend NestJS |
| 5086 | Microservicio AFIP |

## Comando dev más usado

```powershell
npm run dev:stack
```

(Ejecutar desde la raíz del repo, con Docker Desktop para AFIP.)
