# Sprint de revisión POS

Plan por fases para validar backend, integraciones y cableado front-back.

**Última actualización:** 2026-06-17

---

## Estado general

| Sprint | Tema | Estado |
|--------|------|--------|
| **0** | Infraestructura de verificación | 🟡 En curso |
| 1 | Contrato productos (backend ↔ UI) | ⬜ Pendiente |
| 2 | Ventas y caja | ⬜ Pendiente |
| 3 | AFIP en flujo de venta | ⬜ Pendiente |
| 4 | Features secundarios + desktop | ⬜ Pendiente |

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
| 0.5 | Inicializar CodeGraph | ⬜ Pendiente | `codegraph init` en raíz del repo |
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
- [ ] CodeGraph indexado y `codegraph_status` responde

---

## Sprint 1 — Contrato productos

**Objetivo:** alinear `ProductEntity` con el tipo `Product` del frontend.

| ID | Tarea | Estado |
|----|-------|--------|
| 1.1 | Extender entidad: price, cost, stock, categories, barcodes, unit | ⬜ |
| 1.2 | DTOs update + PUT/DELETE | ⬜ |
| 1.3 | Expandir `PosAPI` con CRUD productos | ⬜ |
| 1.4 | Migrar `ProductsManagementView` / `ProductCatalog` → `PosAPI` | ⬜ |
| 1.5 | Tests de contrato front-back | ⬜ |

**Hallazgo actual:** UI usa `WailsAPI` con mocks; backend solo guarda `name`.

---

## Sprint 2 — Ventas y caja

| ID | Tarea | Estado |
|----|-------|--------|
| 2.1 | Rediseñar `SaleEntity` (items[], total, paymentMethod) | ⬜ |
| 2.2 | Modelo `CashSession` en backend | ⬜ |
| 2.3 | Cablear POS + CashView a `PosAPI` | ⬜ |
| 2.4 | Tests E2E venta → stock/caja | ⬜ |

---

## Sprint 3 — AFIP en checkout

| ID | Tarea | Estado |
|----|-------|--------|
| 3.1 | `POST /integrations/afip/facturar` | ⬜ |
| 3.2 | Checkout con facturación opcional | ⬜ |
| 3.3 | Test credenciales reales (`RUN_AFIP_IMPORT_TEST=true`) | ⬜ |

**Hallazgo actual:** AFIP responde en `/afipws/test`; `/api/afipws/test` devuelve 404.

---

## Sprint 4 — Secundarios + desktop

| ID | Tarea | Estado |
|----|-------|--------|
| 4.1 | Encomiendas: backend o quitar del UI | ⬜ |
| 4.2 | Tema/logo: persistencia | ⬜ |
| 4.3 | `WailsAPI` como facade sobre `PosAPI` o eliminar | ⬜ |
| 4.4 | Tests Electron bootstrap | ⬜ |

---

## Mapa de conexiones (referencia)

```text
Frontend :5173
  ├─ PosAPI ──proxy /api──► Backend :3001 ──► SQLite
  │                              └── HTTP ──► AFIP :5086
  └─ WailsAPI ──mock/local──► (no persiste en dev)
```

---

## Bitácora

| Fecha | Sprint | Acción |
|-------|--------|--------|
| 2026-06-17 | 0 | Auditoría inicial: front desconectado del back salvo AFIP |
| 2026-06-17 | 0 | Implementados smoke tests + fix verify AFIP + este documento |
