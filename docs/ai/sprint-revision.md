# Sprint de revisión POS

Plan por fases para validar backend, integraciones y cableado front-back.

**Última actualización:** 2026-06-24

---

## Estado general

| Sprint | Tema | Estado |
|--------|------|--------|
| **0** | Infraestructura de verificación | ✅ Completado |
| **1** | Contrato productos (backend ↔ UI) | ✅ Completado |
| **2** | Ventas y caja | ✅ Completado |
| 3 | AFIP en flujo de venta | ✅ Completado (cambios locales en merge) |
| 4 | Hardware POS + auth (barcode, print, login) | ✅ Completado (2026-06-18) |
| **4A** | Tema/logo persistencia API | ✅ Completado |
| 5 | Secundarios + desktop | 🔄 En progreso (5.1 ✅ UI cableada) |
| **7** | Conectividad remota + PWA | 🟡 MVP + detalle caja (2026-06-18) |
| **4.9** | Soporte recovery + licenciamiento | ✅ Completado (2026-06-18) |

---

## Sprint 4.9 — Soporte recovery + licenciamiento

**Objetivo:** acceso controlado de soporte para export/diagnóstico y enforcement de licencia sin backdoors en código.

### Tareas

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| 4.9.1 | `SupportModule` — unlock/export/diagnostics/reset-admin | ✅ | `backend/src/support/` |
| 4.9.2 | CLI `support-export.ts` offline | ✅ | `npm run support:export --prefix backend` |
| 4.9.3 | `LicenseModule` — Ed25519, machine-id, guard 402 | ✅ | `backend/src/license/`, `tools/generate-license.mjs` |
| 4.9.4 | UI `LicenseRequiredView` (machine-id + paste) + footer cliente | ✅ | `frontend/src/app/components/license/` |
| 4.9.5 | UI recovery oculta (5 clics / Ctrl+Shift+Alt+R) | ✅ | `SupportRecoveryDialog`, `AppVersionFooter` |
| 4.9.6 | Docs + `.env.example` | ✅ | `licensing.md`, claves en `keys/` |
| 4.9.7 | Unit tests license + recovery | ✅ | `license-crypto.test.ts`, `support-recovery.service.test.ts`, smoke recovery adaptativo |
| 4.9.8 | `POST /support/recovery/generate-license` | ✅ | Firma remota con `X-Support-Recovery-Key` |

### Variables de entorno

| Variable | Uso |
|----------|-----|
| `SUPPORT_RECOVERY_SECRET` | Mín. 32 chars; unlock + generate-license remoto |
| `DEV_SKIP_LICENSE` | Solo `NODE_ENV=development`: omite validación |
| `LICENSE_PUBLIC_KEY_PATH` | PEM público (default embebido en repo) |
| `LICENSE_PRIVATE_KEY_PATH` | PEM privado para generación remota en backend |

### Criterios de aceptación

- [x] Sin secretos hardcodeados en source (privada en `tools/keys/`, gitignored)
- [x] Recovery audit-logged (`support.recovery.*`)
- [x] Licencia bloquea API (402) salvo rutas exentas
- [x] Firma Ed25519 + vínculo `machineId` en activación y runtime
- [x] Script CLI `tools/generate-license.mjs` para el equipo

---

## Sprint 0 — Infraestructura de verificación

**Objetivo:** poder ejecutar checks automatizados y saber qué capa falla.

### Tareas

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| 0.1 | Fix `testAfipDirect()` — probar todos los paths | ✅ Hecho | `scripts/verify-microservices.mjs` |
| 0.2 | Smoke tests REST (products, sales, cash, inventory) | ✅ Hecho | `backend/src/api.smoke.test.ts` |
| 0.3 | Expandir verify script con GET+POST por módulo | ✅ Hecho | `scripts/verify-microservices.mjs` |
| 0.4 | Scripts npm `test:api:smoke` | ✅ Hecho | raíz + `backend/package.json` |
| 0.5 | Inicializar CodeGraph | ⚠️ Parcial | `.codegraph/config.json` existe; MCP server no responde; falta `codegraph.db` |
| 0.6 | Actualizar runbook con comandos de test | ✅ Hecho | `docs/ai/dev-runbook.md` |

### Comandos

```powershell
# Unitarios (sin stack)
npm run test:microservices:unit

# Smoke API (requiere pos-api en :3001)
npm run dev:api
npm run test:api:smoke

# Integración completa (pos-api + AFIP opcional)
npm run dev:stack
npm run test:microservices
```

### Criterios de aceptación Sprint 0

- [x] Unit tests AFIP pasan sin servidor
- [x] Smoke tests pasan con API levantada (o skip explícito si no está)
- [x] `verify-microservices` detecta AFIP en `/afipws/test`
- [ ] CodeGraph indexado (`.codegraph/codegraph.db` presente y MCP operativo)

---

## Sprint 1 — Contrato productos

**Objetivo:** alinear `ProductEntity` con el tipo `Product` del frontend y cablear la UI al API.

### Tareas

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| 1.1 | Extender entidad: price, cost, stock, categories, barcodes, unit | ✅ | `product.entity.ts` |
| 1.2 | DTOs update + PUT/DELETE + PUT bulk | ✅ | `products.controller.ts` |
| 1.3 | Expandir `PosAPI` con CRUD productos | ✅ | `frontend/src/lib/pos-api.ts` |
| 1.4 | Migrar inventario y POS a `PosAPI` | ✅ | ProductsManagement, POSScreen* |
| 1.5 | Tests de contrato productos | ✅ | `api.smoke.test.ts` — CRUD |

### Endpoints nuevos

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/products` | Listar |
| GET | `/api/products/:id` | Detalle |
| POST | `/api/products` | Crear |
| PUT | `/api/products/:id` | Actualizar |
| DELETE | `/api/products/:id` | Baja |
| PUT | `/api/products/bulk` | Aumentos masivos / import |

### Criterios de aceptación Sprint 1

- [x] Productos persisten en SQLite (no mock en memoria)
- [x] UI inventario y POS cargan desde `/api/products`
- [x] Smoke test valida contrato CRUD completo

---

## Sprint 2 — Ventas y caja

| ID | Tarea | Estado |
|----|-------|--------|
| 2.1 | Rediseñar `SaleEntity` (items[], total, paymentMethod) | ✅ |
| 2.2 | Modelo `CashSession` en backend | ✅ |
| 2.3 | Cablear POS + CashView a `PosAPI` | ✅ |
| 2.4 | Tests E2E venta → stock/caja | ✅ |

### Endpoints nuevos

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/sales` | Registrar venta (descuenta stock, actualiza caja) |
| GET | `/api/sales` | Listar ventas |
| GET | `/api/cash/session` | Sesión actual o última |
| POST | `/api/cash/session/start` | Abrir caja |
| POST | `/api/cash/session/close` | Cerrar caja con arqueo |

### Criterios de aceptación Sprint 2

- [x] Venta requiere sesión de caja abierta
- [x] Stock se descuenta al vender
- [x] `totalSales` y medios de pago se acumulan en sesión
- [x] POS y vistas de caja usan `PosAPI`

---

## Sprint 3 — AFIP en checkout

| ID | Tarea | Estado |
|----|-------|--------|
| 3.0 | **Guardar clave privada temporal** (antes del .crt aprobado) | ✅ |
| 3.1 | `POST /integrations/afip/facturar` | ✅ |
| 3.2 | Checkout con facturación opcional | ✅ |
| 3.3 | Tests credenciales parciales + import real opcional | ✅ |

**Hallazgo actual:** AFIP responde en `/afipws/test`; `/api/afipws/test` devuelve 404.

### 3.0 — Clave temporal hasta certificado aprobado (completado)

| Pieza | Cambio |
|-------|--------|
| Backend | `POST /integrations/afip/private-key` — guarda key + CUIT; `configured=false`, `pendingCertificate=true` |
| Backend | `POST /integrations/afip/certificate` — agrega .crt cuando AFIP aprueba |
| Backend | `AfipConfigStatus` → campo `pendingCertificate: boolean` |
| Frontend | Dos pasos en `AfipCredentialsSettings`: (1) guardar clave, (2) importar cert cuando llegue |
| Tests | key-only → status parcial; luego cert → `configured=true` |

### Endpoints Sprint 3

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/integrations/afip/private-key` | Guardar CUIT + clave (cert pendiente) |
| POST | `/api/integrations/afip/certificate` | Completar con .crt aprobado |
| POST | `/api/integrations/afip/facturar` | Emitir comprobante vía microservicio AFIP |

### Criterios de aceptación Sprint 3

- [x] Clave privada se puede guardar sin certificado (`pendingCertificate=true`)
- [x] Importar certificado completa configuración (`configured=true`)
- [x] `POST /integrations/afip/facturar` delega al microservicio (paths `/api/afipws/facturador` y `/afipws/facturador`)
- [x] Checkout POS llama facturar cuando `voucherType === "factura"`
- [x] Smoke + unit tests del flujo parcial

---

## Sprint 4 — Hardware POS + auth multi-usuario

**Objetivo:** flujo cajero real (escáner, ticket térmico) y base de usuarios/roles.

| ID | Tarea | Estado | Notas |
|----|-------|--------|-------|
| 4.1 | Escáner código de barras → agregar al carrito sin clic | ✅ | `ProductCatalog` Enter + match exacto |
| 4.2 | `GET /products/by-barcode/:code` (lookup exacto) | ✅ | `products.controller.ts` |
| 4.3 | Impresión térmica real vía Electron IPC | ✅ | IPC `print-receipt` (diálogo sistema; no ESC/POS) |
| 4.4 | Entidad `User` + hash password + JWT real | ✅ | `user.entity.ts`, bcrypt, setup inicial one-shot |
| 4.5 | `JwtAuthGuard` validar token; rutas protegidas | ✅ | Bearer JWT salvo `@PublicRoute()` |
| 4.6 | UI login + sesión + selector cajero | ✅ | `LoginView`, `AuthProvider`, roles en Header |
| 4.7 | Roles (`admin`, `cashier`) en guards y UI | ✅ | `RolesGuard`, tabs admin-only |
| 4.8 | Tests auth + barcode (smoke/unit) | ✅ | `auth.service.test.ts`, `roles.guard.test.ts`, smoke JWT + barcode + setup 409 |

### Criterios de aceptación Sprint 4

- [x] Escanear código + Enter agrega producto al carrito (caja abierta)
- [x] Ticket se imprime desde `.exe` vía diálogo del sistema (MVP; sin driver ESC/POS)
- [x] Login con usuario distinto bloquea rutas según rol
- [x] Ventas registran `userId` / cajero en backend

---

## Sprint 5 — Secundarios + desktop

| ID | Tarea | Estado |
|----|-------|--------|
| 5.1 | Encomiendas: backend o quitar del UI | ✅ | `GET/POST /parcels` + `ParcelsView` → `PosAPI` |
| 5.2 | Tema/logo: persistencia en disco + API | ✅ | `POST/GET/DELETE /api/settings/theme/logo`; SQLite solo referencia; migración data-URL |
| 5.2b | Ticket térmico 55/80 mm | ✅ | `receipt-template.ts` + `receiptWidthMm` en tema |
| 5.3 | `WailsAPI` como facade sobre `PosAPI` o eliminar | 🔄 | Parcels + tema en PosAPI; print/drawer quedan en Wails/Electron |
| 5.4 | Tests Electron bootstrap | ✅ | `desktop/src/bootstrap.smoke.test.ts` |
| 5.5 | Auditoría UI: cablear `AuditView` a API (hoy mock) | ⬜ |
| 5.6 | Movimientos caja: persistir + imprimir comprobante | ✅ | API `/cash` + impresión ingreso/egreso en Caja y POS; reimpresión en tabla |

---

## Sprint 6 — Actualizaciones (auditoría 2026-06-18)

**Documento completo:** [`update-architecture-audit.md`](./update-architecture-audit.md)

**Veredicto:** build/deploy ✅ · protocolo de actualización ❌ (reinstalación manual hoy).

| ID | Tarea | Esfuerzo | Estado |
|----|-------|----------|--------|
| 6.1 | Versionado unificado monorepo | 0.5 d | 🔄 |
| 6.2 | `GET /api/version` | 0.5 d | ✅ |
| 6.3 | Migraciones SQLite formales (sin `synchronize` prod) | 2–3 d | ⬜ |
| 6.4 | electron-updater + publish GitHub | 2 d | ⬜ |
| 6.5 | Check al boot + menú “Buscar actualizaciones” | 1 d | ⬜ |
| 6.6 | UI “actualización disponible” | 1 d | ⬜ |
| 6.7 | CI/CD release workflow | 1.5 d | ⬜ |
| 6.8–6.11 | Canales, rollback, firma, runbook | 3 d | ⬜ |

---

## Sprint 7 — Conectividad remota + PWA

**Objetivo:** permitir que un administrador central supervise precios, resúmenes de ventas y estado de caja de una o varias instalaciones POS, con PWA instalable en móvil y gestión remota acotada de usuarios.

**Documento de arquitectura:** [`remote-connectivity-architecture.md`](./remote-connectivity-architecture.md)

**Veredicto diseño:** relay en nube (Node/Fastify + WSS) + agente mínimo en NestJS + PWA aparte; SQLite **nunca** expuesto a internet.

### Dependencias

| Depende de | Motivo |
|------------|--------|
| **Sprint 4** (4.4–4.7) | Usuarios reales, JWT y `User.active` para **7.5** deshabilitar cajeros remotamente |
| Sprint 0 (smoke tests) | Regresión pos-api al agregar módulo `remote-agent` |
| Sprint 6 (opcional, 6.3) | Migraciones formales antes de tabla `remote_outbox` en prod |

**No bloquea:** 7.0–7.4 pueden avanzar con auth scaffold; 7.5 queda detrás de Sprint 4.

### Fases y backlog

| ID | Fase | Tarea | Esfuerzo | Estado |
|----|------|-------|----------|--------|
| **7.0** | Emparejamiento | Relay: modelo tenant/location/register + `POST /devices/pair` + código QR TTL | 3 d | 🟡 MVP |
| 7.0 | Emparejamiento | Backend: módulo `remote-agent`, `POST /api/remote/pair`, persistir `device.json` en AppData | 2 d | 🟡 MVP |
| 7.0 | Emparejamiento | UI POS: pantalla Ajustes → Remoto (QR scanner / código manual) | 1.5 d | ⬜ |
| **7.1** | Heartbeat | Agente: WSS saliente, heartbeat 30 s, reconexión backoff | 2 d | 🟡 MVP (mock snapshot) |
| 7.1 | Heartbeat | Relay: presencia online/offline, `last_seen`, revocación device | 1.5 d | 🟡 MVP |
| 7.1 | Heartbeat | Tabla `remote_outbox` + reintentos offline | 2 d | ⬜ |
| **7.2** | PWA shell | `apps/remote-portal/`: Vite + vite-plugin-pwa + login + layout | 3 d | 🟡 MVP |
| 7.2 | PWA shell | Deploy estático (Cloudflare Pages / Vercel) + env `VITE_RELAY_URL` | 1 d | 🟡 local dev |
| **7.3** | Multi-local | Portal: selector tenant → local → caja; lista con estado 🟢🟡🔴 | 2.5 d | 🟡 parcial ✅ |
| 7.3 | Multi-local | Relay: agregación snapshots por `location_id` | 2 d | ⬜ |
| **7.4** | Resúmenes API | Agente: push snapshot precios + ventas día + estado caja | 2.5 d | 🟡 parcial ✅ |
| 7.4 | Resúmenes API | Portal: dashboard resúmenes (1 local, N locales, todos) | 2 d | 🟡 parcial ✅ |
| 7.4 | Resúmenes API | Alertas stock bajo (evento umbral) | 1.5 d | ⬜ |
| **7.5** | Usuarios remotos | Relay: comando `disable_user` + cola si offline + audit log | 2 d | ⬜ |
| 7.5 | Usuarios remotos | Backend: `PATCH users/:id` con `active`; guard último admin | 1 d | ⬜ |
| 7.5 | Usuarios remotos | Portal: pantalla usuarios por local, habilitar/deshabilitar | 2 d | ⬜ |
| — | Infra | `services/remote/` Docker + `docker-compose.dev.yml` + scripts npm raíz | 2 d | 🟡 scripts `dev:remote` |
| — | Tests | Smoke pairing mock + unit outbox + contract snapshot DTOs | 2 d | ⬜ |

**Esfuerzo total estimado:** ~32 d-persona (MVP 7.0–7.4 ≈ 22 d; 7.5 + infra + tests ≈ 10 d adicionales).

### Criterios de aceptación Sprint 7

**MVP (7.0–7.4)**

- [ ] Admin empareja una caja con código QR; secret persiste en AppData
- [ ] Portal PWA se instala en móvil (Add to Home Screen)
- [ ] Dashboard muestra online/offline y `last_seen` por caja
- [ ] Resúmenes de ventas del día y estado de caja visibles por local y agregados
- [ ] Snapshot de precios legible desde portal (solo lectura)
- [ ] POS vende con internet caído; eventos se encolan y sincronizan al reconectar
- [ ] SQLite del POS no es accesible desde internet

**Completo (+ 7.5, requiere Sprint 4)**

- [ ] Admin portal deshabilita usuario cajero; POS rechaza login en próximo intento
- [ ] Comando auditado en relay; no se puede deshabilitar último admin del local

### Zonas de no-touch

| Zona | Regla |
|------|-------|
| `services/afip/` | Sin modificaciones |
| Flujos POS venta/caja/checkout | Sin regresiones; agente en background |
| Lógica fiscal / certificados AFIP | No transitan por relay |
| `frontend/` pantallas core | Solo añadir Ajustes → Remoto (7.0) |
| Auth scaffold | No reemplazar hasta Sprint 4; 7.5 espera users reales |

### Puertos propuestos

| Puerto | Servicio |
|--------|----------|
| 5090 | Remote relay |
| 5174 | Remote portal PWA (dev) |

---

## Auditoría extendida (2026-06-18)

Auditoría POS: tests, escáner, impresión, auth. **CodeGraph MCP:** `user-codegraph` en error; `.codegraph/config.json` sin `codegraph.db`. Análisis vía código + grep.

### Resumen por área

| Área | Veredicto |
|------|-----------|
| Tests + estado app (Sprints 0–3) | ✅ / ⚠️ — unit OK; smoke skip sin API |
| Escáner barcode → carrito auto | ✅ |
| Impresión térmica | ⚠️ Electron IPC + diálogo sistema (no ESC/POS) |
| Auth multi-usuario | ✅ MVP (admin/cashier, JWT, login UI) |

### 1. Tests y estado

| Área | Estado | Evidencia |
|------|--------|-----------|
| Smoke API | ✅ | `api.smoke.test.ts` (18 tests, requiere API) |
| Unit AFIP | ✅ | 7 pass |
| Auth unit + smoke | ✅ | `auth.service.test.ts`, `roles.guard.test.ts`, `users.service.test.ts` + smoke |
| Barcode smoke | ✅ | `GET /products/by-barcode/:code` |
| Theme/logo smoke | ✅ | GET/PUT tema, POST/GET/DELETE logo |
| License + recovery unit | ✅ | `license-crypto.test.ts`, `support-recovery.service.test.ts` |
| Parcels unit + smoke | ✅ | `parcels.service.test.ts` + smoke CRUD |
| Frontend/Electron/print tests | ❌ | Sin runner |

**Ejecución 2026-06-18:** unit 9 pass; smoke skipped (API off).

### 2. Escáner — ✅

- ✅ `barcodes[]` backend + inventario; filtro en `ProductCatalog`
- ✅ `Enter` → match exacto → `onAddToCart`; `autoFocus` en búsqueda
- ✅ `GET /products/by-barcode/:code`

### 3. Impresión — ⚠️ MVP Electron

- ✅ Checkout → `WailsAPI.printReceipt` → Electron IPC `print-receipt`
- ⚠️ `webContents.print()` abre diálogo del sistema; sin ESC/POS ni corte automático
- Dev browser: toast demostración

### 4. Auth — ✅ MVP

- ✅ `User` entity, bcrypt, JWT real, `POST /auth/setup` one-shot (sin credenciales por defecto)
- ✅ `JwtAuthGuard` + `RolesGuard`; `GET /auth/setup-status`, `POST /auth/login`, `GET /auth/me`
- ✅ `SetupView` + `LoginView`, token en `PosAPI`, `PATCH /users/:id` (admin)

### 5. Tests pendientes

| Test | Estado |
|------|--------|
| Auth JWT smoke/unit | ✅ |
| Auth setup 409 smoke | ✅ |
| Users PATCH isActive (admin) | ✅ unit + smoke |
| Barcode lookup smoke | ✅ |
| Theme/logo smoke | ✅ |
| Parcels CRUD smoke/unit | ✅ |
| Support recovery 503/401 | ✅ unit + smoke adaptativo |
| Enter → cart e2e | ❌ (manual / futuro Playwright) |
| printReceipt IPC | ✅ (manual en `.exe`) |
| JWT guard | ✅ |

---

## Mapa de conexiones (referencia)

```text
Frontend :5173
  ├─ PosAPI ──proxy /api──► Backend :3001 ──► SQLite
  │                              └── HTTP ──► AFIP :5086
  └─ WailsAPI ──mock/local──► print/drawer stub (legacy window.go)
  └─ Electron preload ──IPC print-receipt──► diálogo impresión sistema
```

---

## Bitácora

| Fecha | Sprint | Acción |
|-------|--------|--------|
| 2026-06-17 | 0 | Auditoría inicial: front desconectado del back salvo AFIP |
| 2026-06-18 | 3 | AFIP: clave temporal, facturar, checkout con factura opcional |
| 2026-06-18 | 4 | Setup inicial one-shot: sin seed `admin`/`admin123`; `SetupView` en primera ejecución |
| 2026-06-18 | 5 | Auditoría arquitectura actualizaciones → `update-architecture-audit.md` |
| 2026-06-18 | 4A | Logo en disco + API `/settings/theme/logo`; ticket térmico 55/80 mm |
| 2026-06-18 | 6 | Backlog actualizaciones auto (Sprint 6) documentado |
| 2026-06-18 | 7 | Diseño conectividad remota → `remote-connectivity-architecture.md` |
| 2026-06-18 | 4.9 | Soporte recovery + licenciamiento (API, UI, docs, tests) |
| 2026-06-18 | 4.9 | Refino licencias: Ed25519, machine-id, `generate-license`, tests crypto |
| 2026-06-18 | tests | Suite ampliada: users, parcels, roles guard, logo, smoke auth/logo/recovery |
| 2026-06-18 | 7 | MVP scaffold: relay :5090, PWA portal :5174, remote-agent stub backend |
| 2026-06-18 | 5/6 | Encomiendas UI→PosAPI; `GET /api/version`; Electron bootstrap smoke |
| 2026-06-18 | 7 | Commit MVP remoto + push; deps `ws`, scripts `dev:remote`/`dev:portal` |
| 2026-06-18 | 7.3/7.4 | Portal clientes + detalle caja; snapshots enriquecidos relay + agente SQLite |
| 2026-06-24 | 5.6 | Movimientos caja: impresión automática y reimpresión desde tabla |
