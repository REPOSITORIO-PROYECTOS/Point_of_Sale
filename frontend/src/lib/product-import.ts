import * as XLSX from "xlsx";
import type { Product } from "./wails-bridge";

export type ImportField =
  | "id"
  | "name"
  | "price"
  | "cost"
  | "categories"
  | "stock"
  | "barcode"
  | "skip";

export type ColumnMapping = Record<number, ImportField>;

export type ParsedSpreadsheet = {
  headers: string[];
  rows: string[][];
};

export type ProductImportRowResult =
  | { ok: true; product: Product }
  | { ok: false; rowIndex: number; reason: string };

export const IMPORT_TEMPLATE_HEADERS = [
  "Código",
  "Producto",
  "Precio",
  "Costo",
  "Categorías",
  "Stock",
  "Código de Barras",
  "IVA %",
  "Nota",
];

const PREVIEW_ROW_COUNT = 5;
export const IMPORT_BATCH_SIZE = 500;

function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseNumber(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ";" || ch === ",") {
      values.push(current);
      current = "";
      if (ch === "," && !line.includes(";")) {
        // comma-separated file
      } else if (ch === "," && line.includes(";")) {
        // mixed — prefer semicolon as primary for AR locale
      }
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function detectDelimiter(headerLine: string): ";" | "," {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

export function parseCsvText(content: string): ParsedSpreadsheet {
  const text = content.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLineWithDelimiter(lines[0], delimiter).map((h) => h.trim());
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLineWithDelimiter(lines[i], delimiter);
    if (cells.every((cell) => cleanCell(cell) === "")) continue;
    while (cells.length < headers.length) cells.push("");
    rows.push(cells.slice(0, headers.length));
  }

  return { headers, rows };
}

function parseCsvLineWithDelimiter(line: string, delimiter: ";" | ","): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];

  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = (matrix[0] ?? []).map((cell) => cleanCell(cell));
  const rows: string[][] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i] ?? [];
    const cells = headers.map((_, index) => cleanCell(line[index]));
    if (cells.every((cell) => cell === "")) continue;
    rows.push(cells);
  }

  return { headers, rows };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (extension === ".csv") {
    const text = await file.text();
    return parseCsvText(text);
  }

  if (extension === ".xlsx" || extension === ".xls") {
    const buffer = await file.arrayBuffer();
    return parseExcelBuffer(buffer);
  }

  throw new Error("Formato no soportado. Usá CSV, XLSX o XLS.");
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

    if (
      normalized.includes("codigo de barras") ||
      normalized.includes("codbarra") ||
      normalized === "barcode"
    ) {
      mapping[index] = "barcode";
    } else if (
      normalized.includes("codigo") ||
      normalized.includes("cod ") ||
      normalized.startsWith("cod") ||
      normalized.includes("idart") ||
      normalized.includes("sku") ||
      normalized === "id"
    ) {
      mapping[index] = "id";
    } else if (normalized.includes("producto") || normalized.includes("nombre") || normalized.includes("articulo")) {
      mapping[index] = "name";
    } else if (normalized.includes("costo")) {
      mapping[index] = "cost";
    } else if (normalized.includes("precio") || normalized.includes("p.v") || normalized === "pvmin") {
      mapping[index] = "price";
    } else if (normalized.includes("categoria") || normalized.includes("rubro")) {
      mapping[index] = "categories";
    } else if (normalized.includes("stock")) {
      mapping[index] = "stock";
    } else {
      mapping[index] = "skip";
    }
  });

  return mapping;
}

function parseCategories(raw: string): string[] {
  const text = raw.trim();
  if (!text) return ["Sin categoría"];

  const rubroMatch = text.match(/^Rubro:\s*(.+)$/i);
  if (rubroMatch) return [rubroMatch[1].trim()];

  return text
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function mapRowsToProducts(
  rows: string[][],
  mapping: ColumnMapping,
): { products: Product[]; skipped: ProductImportRowResult[] } {
  const fieldIndex: Partial<Record<ImportField, number>> = {};
  for (const [index, field] of Object.entries(mapping)) {
    if (field !== "skip") {
      fieldIndex[field] = Number(index);
    }
  }

  const products: Product[] = [];
  const skipped: ProductImportRowResult[] = [];

  rows.forEach((row, rowIndex) => {
    const read = (field: ImportField) => {
      const index = fieldIndex[field];
      return index === undefined ? "" : cleanCell(row[index]);
    };

    const id = read("id");
    const name = read("name");
    const priceRaw = read("price");
    const price = parseNumber(priceRaw);

    if (!id) {
      skipped.push({ ok: false, rowIndex: rowIndex + 2, reason: "Falta código / ID" });
      return;
    }
    if (!name) {
      skipped.push({ ok: false, rowIndex: rowIndex + 2, reason: "Falta nombre" });
      return;
    }
    if (price === null || price < 0) {
      skipped.push({ ok: false, rowIndex: rowIndex + 2, reason: "Precio inválido o vacío" });
      return;
    }

    const costRaw = read("cost");
    const cost = parseNumber(costRaw);
    const stockRaw = read("stock");
    const stockParsed = parseNumber(stockRaw);
    const barcode = read("barcode");

    const product: Product = {
      id,
      name,
      price,
      categories: parseCategories(read("categories")),
      unit: "unidad",
    };

    if (cost !== null && cost >= 0) product.cost = cost;
    if (stockParsed !== null && stockParsed >= 0) product.stock = Math.round(stockParsed);
    if (barcode) product.barcodes = [barcode];

    products.push(product);
  });

  return { products, skipped };
}

export function getPreviewRows(rows: string[][]): string[][] {
  return rows.slice(0, PREVIEW_ROW_COUNT);
}

function csvEscape(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildProductsCsv(products: Product[]): string {
  const lines = [IMPORT_TEMPLATE_HEADERS.join(";")];

  for (const product of products) {
    const row = [
      product.id,
      product.name,
      product.price.toFixed(2),
      product.cost != null ? product.cost.toFixed(2) : "",
      product.categories.join(", "),
      product.stock != null ? String(product.stock) : "",
      product.barcodes?.[0] ?? "",
      "",
      "",
    ];
    lines.push(row.map((cell) => csvEscape(cell)).join(";"));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadImportTemplate() {
  const example = [
    IMPORT_TEMPLATE_HEADERS.join(";"),
    "SKU-001;Yogur natural 200g;850.00;600.00;Lácteos;24;7791234567890;21.0;",
    "SKU-002;Arroz 500g;720.00;600.00;Almacén;12;7792006000117;10.5;",
  ].join("\r\n");

  downloadTextFile("plantilla_productos_pos.csv", `\uFEFF${example}`, "text/csv;charset=utf-8");
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
