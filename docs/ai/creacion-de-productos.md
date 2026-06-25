# Creación de productos — referencia para replicar en otro sistema

Documento técnico que describe **cómo funciona la creación y gestión de productos** en Point of Sale (POS). Está pensado para copiar el diseño en otro sistema (ERP, otro POS, e-commerce interno, etc.).

---

## Resumen ejecutivo

| Aspecto | Decisión del POS |
|---------|------------------|
| Identificador | **String definido por el usuario** (`id`), no autoincremental. Es el SKU/código interno. |
| Categorías | **Array de strings** en el mismo registro. No hay tabla `categories` separada. |
| Códigos de barra | **Array de strings** (un producto puede tener varios). |
| Precio / costo | `float`, mínimo 0. Costo opcional. |
| Stock | Entero opcional. Se descuenta automáticamente al registrar una venta. |
| Unidad de medida | Enum fijo: `unidad`, `gramos`, `kilogramos`, `litros`, `mililitros`. |
| Cantidad del envase | Campo opcional (`quantity`) que describe el tamaño del producto (ej. 500 ml, 200 g). |
| Persistencia | SQLite, tabla `products`. Arrays serializados como JSON en columnas `text`. |
| API | REST bajo `/api/products`, autenticación JWT obligatoria. |

---

## Arquitectura (capas)

```text
┌─────────────────────────────────────────────────────────────┐
│  UI: ProductsManagementView.tsx                             │
│  - Modal "Agregar Producto"                                 │
│  - Validación cliente (campos obligatorios)                 │
│  - PosAPI.createProduct()                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/products  (JSON + JWT)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: ProductsController → ProductsService              │
│  - class-validator en CreateProductDto                      │
│  - ConflictException si id ya existe                        │
│  - mapDtoToEntity → TypeORM save                            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLite: tabla products                                     │
└─────────────────────────────────────────────────────────────┘
```

**Archivos clave en el repo:**

| Capa | Archivo |
|------|---------|
| Entidad / modelo BD | `backend/src/resources/products/product.entity.ts` |
| DTO creación | `backend/src/resources/products/dto/create-product.dto.ts` |
| Lógica de negocio | `backend/src/resources/products/products.service.ts` |
| Endpoints REST | `backend/src/resources/products/products.controller.ts` |
| Cliente HTTP | `frontend/src/lib/pos-api.ts` (`createProduct`, `toProductPayload`) |
| Tipo compartido UI | `frontend/src/lib/wails-bridge.ts` (`interface Product`) |
| Pantalla de alta | `frontend/src/app/components/inventory/ProductsManagementView.tsx` |
| Utilidades categorías | `frontend/src/lib/product-categories.ts` |

> **Nota:** Existe un módulo `inventory` separado (`inventory_items`) con solo `id` + `name`. **No es el catálogo de venta.** El catálogo real es `products`.

---

## Modelo de datos

### Tabla `products` (equivalente SQL)

```sql
CREATE TABLE products (
  id           TEXT PRIMARY KEY,          -- SKU / código interno (lo define el usuario)
  name         TEXT NOT NULL,
  price        REAL NOT NULL DEFAULT 0,   -- precio de venta
  cost         REAL,                      -- costo (opcional)
  categories   TEXT NOT NULL DEFAULT '[]', -- JSON array de strings
  stock        INTEGER,                   -- opcional
  minStock     INTEGER,                   -- opcional, umbral de alerta
  image        TEXT,                      -- opcional (URL o path)
  barcodes     TEXT,                      -- JSON array de strings (opcional)
  unit         TEXT NOT NULL DEFAULT 'unidad',
  quantity     REAL,                      -- tamaño del envase (opcional)
  createdAt    DATETIME NOT NULL,
  updatedAt    DATETIME NOT NULL
);
```

### Tipo `Product` (contrato API / frontend)

```typescript
interface Product {
  id: string;                    // obligatorio, único
  name: string;                  // obligatorio
  price: number;                 // obligatorio, >= 0
  cost?: number;                 // opcional, >= 0
  categories: string[];          // obligatorio, al menos 1 categoría
  stock?: number;                // opcional, entero >= 0
  minStock?: number;             // opcional, entero >= 0
  image?: string;                // opcional
  barcodes?: string[];           // opcional, 0..N códigos
  unit?: "unidad" | "gramos" | "kilogramos" | "litros" | "mililitros";
  quantity?: number;             // opcional, >= 0 (ej. 500 para 500 ml)
}
```

### Unidades de medida

| Valor | Uso típico |
|-------|------------|
| `unidad` | Producto contado por pieza (default) |
| `gramos` | Pesables; en POS pide peso al agregar al carrito |
| `kilogramos` | Pesables; en POS pide peso al agregar al carrito |
| `litros` | Líquidos por volumen |
| `mililitros` | Líquidos; la UI muestra conversión a litros si >= 1000 |

El campo `quantity` describe el **tamaño del envase** (ej. un yogur de 200 g), no la cantidad en el carrito de venta.

---

## API REST

**Base URL dev:** `http://127.0.0.1:3001/api`  
**Prefijo global:** `/api`  
**Auth:** header `Authorization: Bearer <JWT>` (cualquier usuario autenticado; no requiere rol `admin`).

### Crear producto

```http
POST /api/products
Content-Type: application/json
Authorization: Bearer <token>

{
  "id": "PROD-001",
  "name": "Café molido",
  "price": 1500,
  "cost": 800,
  "categories": ["Cafetería", "Bebidas"],
  "stock": 50,
  "minStock": 10,
  "barcodes": ["7891234567890"],
  "unit": "unidad",
  "quantity": 1
}
```

**Respuesta exitosa:** `201 Created` con el producto creado (mismo shape que el request, arrays ya parseados).

**Errores habituales:**

| HTTP | Causa |
|------|-------|
| `400` | Validación fallida (falta `categories`, precio negativo, etc.) |
| `401` | Sin token o token inválido |
| `409` | `id` ya existe (`ConflictException`) |

### Otros endpoints relacionados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/products` | Lista todos, ordenados por nombre ASC |
| `GET` | `/api/products/:id` | Uno por ID |
| `GET` | `/api/products/by-barcode/:code` | Busca por código de barra (scan en POS) |
| `PUT` | `/api/products/:id` | Actualización parcial (sin cambiar `id`) |
| `DELETE` | `/api/products/:id` | Baja lógica/física (borra el registro) |
| `PUT` | `/api/products/bulk` | Upsert masivo: `{ "products": [ ...CreateProductDto ] }` |

### Validación backend (`CreateProductDto`)

| Campo | Reglas |
|-------|--------|
| `id` | string, obligatorio |
| `name` | string, obligatorio |
| `price` | number, `>= 0`, obligatorio |
| `cost` | number, `>= 0`, opcional |
| `categories` | array de strings, **mínimo 1 elemento** |
| `stock` | entero, `>= 0`, opcional |
| `minStock` | entero, `>= 0`, opcional |
| `image` | string, opcional |
| `barcodes` | array de strings, opcional |
| `unit` | uno de `PRODUCT_UNITS`, default `unidad` |
| `quantity` | number, `>= 0`, opcional |

El `ValidationPipe` global usa `whitelist: true` y `transform: true` (convierte strings numéricos del JSON).

---

## Flujo de creación en la UI

Pantalla: **Inventario → Gestión de Productos → Agregar Producto**.

### Campos del formulario

| Campo UI | Obligatorio | Notas |
|----------|-------------|-------|
| Código / ID | Sí | Deshabilitado al editar (no se puede cambiar el PK) |
| Nombre | Sí | |
| Categorías | Sí (≥1) | Checkboxes de categorías existentes + input para crear nuevas |
| Unidad de medida | No | Default `unidad` |
| Cantidad (envase) | No | Solo informativo / etiquetado |
| Códigos de barra | No | Lista editable; Enter agrega; sin duplicados en el mismo producto |
| Precio de venta | Sí | |
| Costo | No | |
| Stock disponible | No | |
| Stock mínimo | No | Si `stock < minStock`, la tabla muestra badge "Bajo Stock" |

### Validación en cliente (antes de llamar API)

```typescript
if (!formData.id || !formData.name || !formData.price || formData.categories.length === 0) {
  // toast: "Completa los campos obligatorios"
  return;
}
```

### Payload que arma el frontend

```typescript
const newProduct: Product = {
  id: formData.id,
  name: formData.name,
  price: parseFloat(formData.price),
  cost: formData.cost ? parseFloat(formData.cost) : undefined,
  categories: formData.categories,
  stock: formData.stock ? parseInt(formData.stock) : undefined,
  minStock: formData.minStock ? parseInt(formData.minStock) : undefined,
  barcodes: barcodes.length > 0 ? barcodes : undefined,
  unit: formData.unit,
  quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
};

await PosAPI.createProduct(newProduct);
// POST /api/products
```

Tras éxito: el producto se agrega al estado local y se cierra el modal.

---

## Categorías (diseño importante)

- **No hay entidad `Category`.** Las categorías viven como strings dentro de cada producto.
- La lista de categorías del formulario se arma con:
  1. Un set de categorías por defecto (`DEFAULT_CATEGORIES`: Cafetería, Panadería, Bebidas, etc.)
  2. Más todas las categorías ya usadas en productos existentes.
- Un producto puede tener **varias categorías** (ej. `["Bebidas", "Cafetería"]`).
- Compatibilidad legacy: si llega un producto viejo con campo `category` (string), `normalizeProduct()` lo convierte a `categories: [category]`.
- Para importar desde CSV, las categorías pueden venir separadas por `,`, `;` o `|` (`parseCategoriesInput`).

**Para replicar:** podés usar tabla `categories` + tabla puente `product_categories`, pero este POS eligió simplicidad: un JSON array por producto.

---

## Códigos de barra

- Almacenados como JSON array en columna `barcodes`.
- Búsqueda en POS: `GET /api/products/by-barcode/:code` recorre productos y compara con `trim()` (no hay índice dedicado).
- En el formulario: se agregan de a uno; no se permiten duplicados en la misma lista del modal.
- El `id` del producto **no tiene por qué** ser igual al código de barra (son conceptos separados).

---

## Stock y ventas

Al registrar una venta (`POST /api/sales`), por cada ítem:

```typescript
await productsService.decrementStock(item.id, item.quantity);
```

- Solo descuenta si el producto tiene `stock` definido (no `null`).
- El stock nunca baja de 0: `Math.max(0, stock - quantity)`.
- Si no hay sesión de caja abierta, la venta falla antes de tocar stock.

**Para replicar:** definí si el stock es obligatorio o opcional; aquí es opcional (productos sin `stock` no participan del control).

---

## Importación masiva

### API bulk

```http
PUT /api/products/bulk
{ "products": [ { "id": "...", "name": "...", ... }, ... ] }
```

- Por cada producto: si existe `id` → update; si no → create.
- Usado por "Suba de Precios" en la UI (reemplaza lista completa con precios recalculados).

### CSV (script de exportación / formato esperado)

El script `scripts/export-lc-to-elixia.cjs` genera columnas compatibles con import:

| Columna | Mapeo |
|---------|-------|
| Código | `id` |
| Producto | `name` |
| Precio | `price` |
| Costo | `cost` |
| Categorías | `categories` (separadas por coma) |
| Stock | `stock` |
| Código de Barras | `barcodes` |

La vista `ImportExportView.tsx` tiene UI de mapeo de columnas; la lectura real de Excel/CSV puede estar en evolución (hay mock de preview).

---

## Ejemplo completo con `curl`

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"..."}' | jq -r .accessToken)

# 2. Crear producto
curl -s -X POST http://127.0.0.1:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "SKU-CAFE-01",
    "name": "Café Espresso",
    "price": 2500,
    "cost": 1200,
    "categories": ["Cafetería", "Bebidas"],
    "stock": 100,
    "minStock": 20,
    "unit": "unidad",
    "barcodes": ["7791234567890"]
  }'
```

---

## Uso en el POS (después de crear)

1. **Catálogo de venta** (`ProductCatalog.tsx`): carga productos con `GET /api/products`, filtra por nombre/categoría/barcode.
2. **Productos pesables** (`unit` = `gramos` o `kilogramos`): al hacer clic, abre diálogo para ingresar peso antes de agregar al carrito.
3. **Escaneo de barcode**: el buscador llama `getProductByBarcode` si el input parece un código.

---

## Checklist para replicar en otro sistema

### Modelo

- [ ] PK string `id` definida por el usuario (o decidir autogenerar y mapear SKU aparte)
- [ ] Precio y costo como decimales no negativos
- [ ] Categorías multi-valor (array o relación N:N)
- [ ] Barcodes multi-valor
- [ ] Enum de unidades de medida alineado al negocio
- [ ] `minStock` + alerta visual cuando `stock < minStock`

### API

- [ ] `POST` crear con validación y `409` en duplicado de ID
- [ ] `GET` listado y búsqueda por barcode
- [ ] `PUT` actualización parcial
- [ ] `PUT` bulk upsert para migraciones y ajustes masivos de precio
- [ ] Autenticación en todos los endpoints de catálogo

### UI

- [ ] Modal crear/editar con mismos campos obligatorios
- [ ] Categorías: selección múltiple + alta inline de categoría nueva
- [ ] Barcodes: lista con agregar/quitar
- [ ] ID inmutable en edición
- [ ] Tabla con búsqueda por nombre, código, categoría y barcode

### Operación

- [ ] Descuento de stock al confirmar venta (si aplica control de inventario)
- [ ] Herramienta de suba de precios (% general, por categoría, o selección manual)

---

## Decisiones de diseño que conviene copiar

1. **ID legible por humanos** — facilita etiquetas, planillas y soporte.
2. **Categorías embebidas** — menos joins; ideal para catálogos medianos.
3. **Múltiples barcodes por producto** — útil cuando el mismo artículo tiene EAN de bulto y unidad.
4. **Separar `id` de `barcodes`** — el escáner no fuerza que el SKU sea el EAN.
5. **Stock opcional** — comercios que no controlan inventario pueden ignorar el campo.
6. **Unidad + cantidad de envase** — etiquetado claro sin mezclar con cantidad vendida.

---

## Swagger

Con `ENABLE_SWAGGER=true` en el backend: documentación interactiva en  
`http://127.0.0.1:3001/api/docs` → tag **products**.

---

*Generado a partir del código en `backend/src/resources/products/` y `frontend/src/app/components/inventory/ProductsManagementView.tsx`.*
