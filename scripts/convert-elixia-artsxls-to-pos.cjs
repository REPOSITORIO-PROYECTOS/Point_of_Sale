/**
 * Convierte 02_articulos_artsxls_elixia.csv (formato Elixia ArtsXLS)
 * al CSV de importación del POS (03_productos_pos).
 *
 * Uso:
 *   node scripts/convert-elixia-artsxls-to-pos.cjs --in scoped to user's file
 *   node scripts/convert-elixia-artsxls-to-pos.cjs --in "C:\...\02_articulos_artsxls_elixia.csv"
 *   node scripts/convert-elixia-artsxls-to-pos.cjs --in arts.csv --out exports/elixia --rubros 01_rubros_elixia.csv
 */

const fs = require('fs');
const path = require('path');

const POS_COLUMNS = [
  'Código',
  'Producto',
  'Precio',
  'Costo',
  'Categorías',
  'Stock',
  'Código de Barras',
  'IVA %',
  'Nota',
];

function parseArgs(argv) {
  const args = { in: null, out: null, rubros: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--in' && argv[i + 1]) {
      args.in = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--rubros' && argv[i + 1]) {
      args.rubros = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatDecimal(value, decimals = 2) {
  const n = toNumber(value);
  if (n === null) return '';
  return n.toFixed(decimals);
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(';')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? '')).join(';'));
  }
  fs.writeFileSync(filePath, `\uFEFF${lines.join('\r\n')}`, 'utf8');
}

function parseCsv(content) {
  const text = content.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(';').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j += 1) {
      const ch = lines[i][j];
      if (inQuotes) {
        if (ch === '"' && lines[i][j + 1] === '"') {
          current += '"';
          j += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ';') {
        values.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current);

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function loadRubrosMap(rubrosPath) {
  const map = new Map();
  if (!rubrosPath || !fs.existsSync(rubrosPath)) return map;

  const { rows } = parseCsv(fs.readFileSync(rubrosPath, 'utf8'));
  for (const row of rows) {
    const id = cleanText(row.IDRubro).replace(/\.0$/, '');
    const name = cleanText(row['Descripción'] || row.Descripcion);
    if (id && name) map.set(id, name);
  }
  return map;
}

function deriveSalePrice(row) {
  for (const key of ['PVMin', 'PVInt', 'PVMay']) {
    const n = toNumber(row[key]);
    if (n && n > 0) return n;
  }
  return null;
}

function deriveCost(row) {
  const cost = toNumber(row.PrecioCosto);
  return cost && cost > 0 ? cost : null;
}

function deriveCategory(row, rubroMap) {
  const idRubro = cleanText(row.IDRubro).replace(/\.0$/, '');
  if (idRubro && rubroMap.has(idRubro)) {
    return rubroMap.get(idRubro);
  }

  const nota = cleanText(row.Nota);
  const rubroMatch = nota.match(/^Rubro:\s*(.+)$/i);
  if (rubroMatch) return rubroMatch[1].trim();

  if (idRubro && idRubro !== '0') return `Rubro ${idRubro}`;
  return 'Sin categoría';
}

function deriveNota(row) {
  const nota = cleanText(row.Nota);
  if (!nota) return '';
  if (/^Rubro:/i.test(nota)) return '';
  return nota;
}

function mapArtsRowToPos(row, rubroMap) {
  const sale = deriveSalePrice(row);
  const cost = deriveCost(row);
  const barcode = cleanText(row.CodBarra);

  return {
    'Código': cleanText(row.IDArt),
    Producto: cleanText(row.Articulo),
    Precio: sale !== null ? sale.toFixed(2) : '',
    Costo: cost !== null ? cost.toFixed(2) : '',
    'Categorías': deriveCategory(row, rubroMap),
    Stock: '0',
    'Código de Barras': barcode,
    'IVA %': formatDecimal(row.PorcIVA ?? '0', 1),
    Nota: deriveNota(row),
  };
}

function main() {
  const { in: inputPath, out: outDirArg, rubros: rubrosPath } = parseArgs(process.argv);

  if (!inputPath) {
    console.error('Uso: node scripts/convert-elixia-artsxls-to-pos.cjs --in <artsxls.csv> [--out <dir>] [--rubros <rubros.csv>]');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`No se encontró el archivo: ${inputPath}`);
    process.exit(1);
  }

  const outDir = outDirArg || path.dirname(inputPath);
  fs.mkdirSync(outDir, { recursive: true });

  const rubroMap = loadRubrosMap(rubrosPath);
  const { rows } = parseCsv(fs.readFileSync(inputPath, 'utf8'));

  const posRows = rows
    .filter((row) => cleanText(row.IDArt) !== '')
    .map((row) => mapArtsRowToPos(row, rubroMap));

  const baseName = path.basename(inputPath, path.extname(inputPath)).replace(/artsxls_elixia/i, 'productos_pos');
  const outCsv = path.join(outDir, baseName.includes('productos_pos') ? `${baseName}.csv` : '03_productos_pos.csv');

  writeCsv(outCsv, POS_COLUMNS, posRows);

  const withPrice = posRows.filter((r) => cleanText(r.Precio) !== '').length;
  const withCost = posRows.filter((r) => cleanText(r.Costo) !== '').length;
  const withBarcode = posRows.filter((r) => cleanText(r['Código de Barras']) !== '').length;
  const categories = new Set(posRows.map((r) => r['Categorías'])).size;

  console.log('Conversión lista.');
  console.log(`  Entrada:  ${inputPath}`);
  console.log(`  Salida:   ${outCsv}`);
  console.log(`  Filas:    ${posRows.length}`);
  console.log(`  Con precio: ${withPrice} | Con costo: ${withCost} | Con barcode: ${withBarcode} | Categorías: ${categories}`);
  console.log('');
  console.log('Abrí el CSV en Excel (separador ;). Para .xlsx: Archivo → Guardar como → Libro de Excel.');
}

main();
