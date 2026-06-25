/**
 * Exporta lc_consolidada.db a planillas compatibles con Elixia PAS (FrancoApp)
 * y con el importador del POS (Código, Producto, Precio, Categoría, Stock).
 *
 * Uso:
 *   node scripts/export-lc-to-elixia.cjs
 *   node scripts/export-lc-to-elixia.cjs --out exports/elixia
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const ROOT = path.join(__dirname, '..');
const DEFAULT_DB = path.join(ROOT, 'lc_consolidada.db');
const DEFAULT_OUT = path.join(ROOT, 'exports', 'elixia');

const ELIXIA_ARTS_COLUMNS = [
  'IDArt',
  'CodProveedor',
  'Articulo',
  'PrecioCosto',
  'PorcIVA',
  'IDProveedor',
  'IDRubro',
  'IDMoneda',
  'MargenMin',
  'MargenInt',
  'MargenMay',
  'UniBulto',
  'PorcDto',
  'PorcRec',
  'PrecioFlete',
  'PVMin',
  'PVInt',
  'PVMay',
  'CodBarra',
  'Nota',
];

const ELIXIA_RUBRO_COLUMNS = [
  'IDRubro',
  'Descripción',
  'Insumos',
  'ModifImporte',
  'NoFact',
  'Servicios',
  'Combus',
];

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
  const args = { db: DEFAULT_DB, out: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--db' && argv[i + 1]) {
      args.db = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function openDb(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatDecimal(value, decimals = 4) {
  const n = toNumber(value);
  if (n === null) return '';
  return n.toFixed(decimals);
}

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

async function findTable(db, likePrefix) {
  const rows = await all(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE ? ORDER BY name LIMIT 1",
    [`${likePrefix}%`],
  );
  return rows.length ? rows[0].name : null;
}

async function findArticleCatalogTable(db) {
  const rows = await all(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'sql_%' ORDER BY name",
  );
  for (const row of rows) {
    const name = row.name;
    if (name.includes('ArtsStock') || name.includes('ArtsCBar') || name.includes('ArtsProv') || name.includes('ArtsDtos')) {
      continue;
    }
    const cols = await tableColumns(db, name);
    if (cols.includes('IDArt') && cols.some((col) => /descrip/i.test(col))) {
      return name;
    }
  }
  return null;
}

async function tableColumns(db, tableName) {
  const rows = await all(db, `PRAGMA table_info("${tableName}")`);
  return rows.map((row) => row.name);
}

function pickColumn(columns, ...candidates) {
  for (const candidate of candidates) {
    const found = columns.find((col) => col === candidate || col.toLowerCase() === candidate.toLowerCase());
    if (found) return found;
  }
  const fuzzy = columns.find((col) => /descrip/i.test(col));
  return fuzzy || candidates[0];
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function isPlaceholderName(name) {
  const text = cleanText(name);
  return !text || text === 'XX' || /^Artículo\s+\d+$/i.test(text);
}

function incoherentNameReason(name) {
  const text = cleanText(name);
  if (!text) return 'nombre vacío';
  if (text === 'XX') return 'marcador XX';
  if (/^Artículo\s+\d+$/i.test(text)) return 'placeholder Artículo N';
  if (text.length < 3) return 'nombre muy corto';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(text)) return 'sin letras (solo código numérico)';
  if (/^AOE\b/i.test(text) || /\bAOE\s+AOE\b/i.test(text)) return 'patrón AOE';
  if (/^[A-Z]{2,5}\s+\d{3,}$/i.test(text)) return 'código tipo SIG 1234';
  return null;
}

function isCoherentName(name) {
  return incoherentNameReason(name) === null;
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

function deriveSalePrice(row) {
  const pvMin = toNumber(row.pv_min);
  if (pvMin && pvMin > 0) return pvMin;

  const pvInt = toNumber(row.pv_int);
  if (pvInt && pvInt > 0) return pvInt;

  const pvMay = toNumber(row.pv_may);
  if (pvMay && pvMay > 0) return pvMay;

  const shelf = toNumber(row.precio_gondola);
  if (shelf && shelf > 0) return shelf;

  const avgSale = toNumber(row.precio_venta_prom);
  if (avgSale && avgSale > 0) return avgSale;

  return null;
}

function deriveCost(row) {
  const cost = toNumber(row.precio_costo);
  if (cost && cost > 0) return cost;

  const purchase = toNumber(row.precio_compra);
  if (purchase && purchase > 0) return purchase;

  return null;
}

function deriveName(row) {
  const sqlName = cleanText(row.sql_descripcion);
  if (!isPlaceholderName(sqlName)) return sqlName;

  const articulo = cleanText(row.articulo);
  if (!isPlaceholderName(articulo)) return articulo;

  const codProv = cleanText(row.cod_proveedor);
  if (codProv) return codProv;

  return `Artículo ${cleanText(row.id_art)}`;
}

async function loadRubros(db) {
  const sqlRubrosTable = await findTable(db, 'sql_Rubros');
  if (sqlRubrosTable) {
    const rubroCols = await tableColumns(db, sqlRubrosTable);
    const descCol = pickColumn(rubroCols, 'Descripción', 'Descripcion');
    const fromSql = await all(
      db,
      `SELECT * FROM "${sqlRubrosTable}" ORDER BY CAST(IDRubro AS REAL)`,
    );
    if (fromSql.length > 0) {
      return fromSql.map((r) => ({
        IDRubro: cleanText(r.IDRubro).replace(/\.0$/, '') || '0',
        'Descripción': cleanText(r[descCol]) || `Rubro ${r.IDRubro}`,
        Insumos: cleanText(r.Insumos),
        ModifImporte: cleanText(r.ModifImporte),
        NoFact: cleanText(r.NoFact),
        Servicios: cleanText(r.Servicios),
        Combus: cleanText(r.Combus),
      }));
    }
  }

  const fromCsv = await all(db, 'SELECT * FROM csv_rubros_articulos_mdb ORDER BY CAST(IDRubro AS REAL)');
  if (fromCsv.length > 0) {
    return fromCsv.map((r) => ({
      IDRubro: cleanText(r.IDRubro).replace(/\.0$/, '') || '0',
      'Descripción': cleanText(r['Descripción']) || `Rubro ${r.IDRubro}`,
      Insumos: cleanText(r.Insumos),
      ModifImporte: cleanText(r.ModifImporte),
      NoFact: cleanText(r.NoFact),
      Servicios: cleanText(r.Servicios),
      Combus: cleanText(r.Combus),
    }));
  }

  const inferred = await all(db, `
    SELECT DISTINCT TRIM(IDRubro) AS IDRubro
    FROM mdb_TArtsXLS
    WHERE IDRubro IS NOT NULL AND TRIM(IDRubro) != ''
    ORDER BY CAST(IDRubro AS REAL)
  `);

  return inferred.map((r) => ({
    IDRubro: cleanText(r.IDRubro).replace(/\.0$/, '') || '0',
    'Descripción': `Rubro ${cleanText(r.IDRubro).replace(/\.0$/, '')}`,
    Insumos: '',
    ModifImporte: '',
    NoFact: '',
    Servicios: '',
    Combus: '',
  }));
}

async function loadArticles(db) {
  const sqlArtTable = await findArticleCatalogTable(db);
  const sqlStockTable = await findTable(db, 'sql_ArtsStock');
  const sqlCBarTable = await findTable(db, 'sql_ArtsCBar');
  const artCols = sqlArtTable ? await tableColumns(db, sqlArtTable) : [];
  const descCol = artCols.length ? pickColumn(artCols, 'Descripción', 'Descripcion') : null;
  const descExpr = sqlArtTable && descCol ? `a.${quoteIdent(descCol)}` : "''";

  const idSources = [
    'SELECT IDArt FROM mdb_TStockTotal',
    'SELECT IDArt FROM mdb_TVentasXArt',
    'SELECT IDArt FROM mdb_TArtsXLS',
    'SELECT IDArt FROM mdb_TEtiqGon',
  ];
  if (sqlArtTable) {
    idSources.push(`SELECT IDArt FROM "${sqlArtTable}"`);
  }
  if (sqlCBarTable) {
    idSources.push(`SELECT IDArt FROM "${sqlCBarTable}"`);
  }

  const artJoin = sqlArtTable ? `LEFT JOIN "${sqlArtTable}" a ON a.IDArt = i.IDArt` : '';
  const cbarJoin = sqlCBarTable
    ? `LEFT JOIN (
        SELECT IDArt, MIN(TRIM(CodBar)) AS cod_bar_sql
        FROM "${sqlCBarTable}"
        WHERE CodBar IS NOT NULL AND TRIM(CodBar) != ''
        GROUP BY IDArt
      ) cb ON cb.IDArt = i.IDArt`
    : '';
  const stockJoin = sqlStockTable
    ? `LEFT JOIN (
        SELECT IDArt, SUM(CAST(StockAct AS REAL)) AS stock_sql
        FROM "${sqlStockTable}"
        GROUP BY IDArt
      ) st ON st.IDArt = i.IDArt`
    : '';

  return all(db, `
    WITH ids AS (
      ${idSources.join('\n      UNION\n      ')}
    ),
    ventas AS (
      SELECT
        IDArt,
        MAX(CAST(PrecioUniCpra AS REAL)) AS precio_compra,
        AVG(CAST(ImpVta AS REAL) / NULLIF(ABS(CAST(Cantidad AS REAL)), 0)) AS precio_venta_prom
      FROM mdb_TVentasXArt
      GROUP BY IDArt
    )
    SELECT
      i.IDArt AS id_art,
      ${descExpr} AS sql_descripcion,
      x.Articulo AS articulo,
      COALESCE(x.CodProveedor, ${sqlArtTable ? 'a.IDArtProv' : "''"}) AS cod_proveedor,
      COALESCE(${sqlArtTable ? 'a.PrecioCpraCI, a.PrecioCpraSI' : 'NULL, NULL'}, x.PrecioCosto) AS precio_costo,
      COALESCE(${sqlArtTable ? 'a.PrecioVta1' : 'NULL'}, x.PVMin) AS pv_min,
      COALESCE(${sqlArtTable ? 'a.PrecioVta2' : 'NULL'}, x.PVInt) AS pv_int,
      COALESCE(${sqlArtTable ? 'a.PrecioVta3' : 'NULL'}, x.PVMay) AS pv_may,
      COALESCE(x.IDProveedor, ${sqlArtTable ? 'a.IDProveedor' : 'NULL'}) AS id_proveedor,
      COALESCE(x.IDRubro, ${sqlArtTable ? 'a.IDRubro' : 'NULL'}) AS id_rubro,
      COALESCE(x.IDMoneda, ${sqlArtTable ? 'a.IDMoneda' : 'NULL'}) AS id_moneda,
      COALESCE(x.PorcIVA, ${sqlArtTable ? 'a.PorcIVA1' : 'NULL'}) AS porc_iva,
      COALESCE(x.MargenMIn, ${sqlArtTable ? 'a.PorcGanMin' : 'NULL'}) AS margen_min,
      COALESCE(x.MargenInt, ${sqlArtTable ? 'a.PorcGanInt' : 'NULL'}) AS margen_int,
      COALESCE(x.MargenMay, ${sqlArtTable ? 'a.PorcGanMay' : 'NULL'}) AS margen_may,
      COALESCE(x.UniBulto, ${sqlArtTable ? 'a.UniXBulto' : 'NULL'}) AS uni_bulto,
      COALESCE(x.PorcDto1, ${sqlArtTable ? 'a.PorcDto1' : 'NULL'}) AS porc_dto1,
      COALESCE(x.PorcDto2, ${sqlArtTable ? 'a.PorcDto2' : 'NULL'}) AS porc_dto2,
      COALESCE(x.PrecioFlete, ${sqlArtTable ? 'a.PrecioFlete' : 'NULL'}) AS precio_flete,
      COALESCE(${sqlCBarTable ? 'cb.cod_bar_sql' : 'NULL'}, x.CodBarra) AS cod_barra,
      COALESCE(x.Nota, ${sqlArtTable ? 'a.Notas' : "''"}) AS nota,
      COALESCE(s.SumaDeCant, ${sqlStockTable ? 'st.stock_sql' : 'NULL'}) AS stock,
      g.PrecioVta AS precio_gondola,
      v.precio_compra,
      v.precio_venta_prom
    FROM ids i
    LEFT JOIN mdb_TArtsXLS x ON x.IDArt = i.IDArt
    ${artJoin}
    ${cbarJoin}
    LEFT JOIN mdb_TStockTotal s ON s.IDArt = i.IDArt
    ${stockJoin}
    LEFT JOIN mdb_TEtiqGon g ON g.IDArt = i.IDArt
    LEFT JOIN ventas v ON v.IDArt = i.IDArt
    ORDER BY i.IDArt
  `);
}

function mapElixiaRow(row, rubroNameById) {
  const idRubro = cleanText(row.id_rubro).replace(/\.0$/, '') || '0';
  const cost = deriveCost(row);
  const sale = deriveSalePrice(row);
  const name = deriveName(row);

  return {
    IDArt: cleanText(row.id_art),
    CodProveedor: cleanText(row.cod_proveedor) || cleanText(row.id_art),
    Articulo: name,
    PrecioCosto: formatDecimal(cost),
    PorcIVA: formatDecimal(row.porc_iva ?? '0', 1),
    IDProveedor: cleanText(row.id_proveedor).replace(/\.0$/, '') || '0',
    IDRubro: idRubro,
    IDMoneda: cleanText(row.id_moneda).replace(/\.0$/, '') || '1',
    MargenMin: formatDecimal(row.margen_min ?? '0', 1),
    MargenInt: formatDecimal(row.margen_int ?? '0', 1),
    MargenMay: formatDecimal(row.margen_may ?? '0', 1),
    UniBulto: cleanText(row.uni_bulto) || '0',
    PorcDto: formatDecimal(row.porc_dto1 ?? '0', 1),
    PorcRec: formatDecimal(row.porc_dto2 ?? '0', 1),
    PrecioFlete: formatDecimal(row.precio_flete ?? '0'),
    PVMin: formatDecimal(sale ?? row.pv_min),
    PVInt: formatDecimal(toNumber(row.pv_int) ?? sale),
    PVMay: formatDecimal(row.pv_may),
    CodBarra: cleanText(row.cod_barra),
    Nota: cleanText(row.nota) || (rubroNameById.get(idRubro) ? `Rubro: ${rubroNameById.get(idRubro)}` : ''),
  };
}

function mapPosRow(row, rubroNameById) {
  const idRubro = cleanText(row.id_rubro).replace(/\.0$/, '') || '0';
  const category = rubroNameById.get(idRubro) || (idRubro === '0' ? 'Sin categoría' : `Rubro ${idRubro}`);
  const sale = deriveSalePrice(row);
  const cost = deriveCost(row);
  const stock = toNumber(row.stock);

  return {
    'Código': cleanText(row.id_art),
    Producto: deriveName(row),
    Precio: sale !== null ? sale.toFixed(2) : '',
    Costo: cost !== null ? cost.toFixed(2) : '',
    'Categorías': category,
    Stock: stock !== null ? String(Math.round(stock)) : '0',
    'Código de Barras': cleanText(row.cod_barra),
    'IVA %': formatDecimal(row.porc_iva ?? '0', 1),
    Nota: cleanText(row.nota),
  };
}

function writeReadme(outDir, stats) {
  const lines = [
    '# Export Elixia PAS / POS',
    '',
    `Generado: ${new Date().toISOString()}`,
    `Origen: lc_consolidada.db (FrancoApp.mdb + SQL LC cuando está importado)`,
    '',
    '## Archivos',
    '',
    '| Archivo | Uso |',
    '|---------|-----|',
    '| `01_rubros_elixia.csv` | Rubros / categorías para Elixia PAS |',
    '| `02_articulos_artsxls_elixia.csv` | Importación de artículos (formato ArtsXLS) |',
    '| `03_productos_pos.csv` | Importación al POS de este repo |',
    '| `04_articulos_excluidos.csv` | Artículos omitidos por nombre incoherente |',
    '',
    '## Estadísticas',
    '',
    `- Rubros: ${stats.rubros}`,
    `- Artículos exportados: ${stats.articles}`,
    `- Con nombre real (no placeholder): ${stats.withRealName}`,
    `- Con precio de venta estimado: ${stats.withSalePrice}`,
    `- Con stock > 0: ${stats.withStock}`,
    `- Con código de barras: ${stats.withBarcode}`,
    `- Excluidos por nombre incoherente: ${stats.excluded}`,
    '',
    '## Importante',
    '',
    stats.warnings.map((w) => `- ${w}`).join('\n'),
    '',
    'Abrí los CSV con Excel (separador `;`). Si Elixia exige `.xlsx`, abrí el CSV en Excel y guardá como libro de Excel.',
  ];
  fs.writeFileSync(path.join(outDir, 'README.md'), lines.join('\n'), 'utf8');
}

async function main() {
  const { db: dbPath, out: outDir } = parseArgs(process.argv);

  if (!fs.existsSync(dbPath)) {
    console.error(`No se encontró la base: ${dbPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const db = await openDb(dbPath);
  try {
    const rubros = await loadRubros(db);
    const rubroNameById = new Map(rubros.map((r) => [r.IDRubro, r['Descripción']]));

    const allArticles = await loadArticles(db);
    const articles = [];
    const excludedRows = [];

    for (const row of allArticles) {
      const name = deriveName(row);
      const reason = incoherentNameReason(name);
      if (reason) {
        excludedRows.push({
          IDArt: cleanText(row.id_art),
          Articulo: name,
          Motivo: reason,
          PrecioCosto: formatDecimal(deriveCost(row)),
          PVMin: formatDecimal(deriveSalePrice(row) ?? row.pv_min),
        });
      } else {
        articles.push(row);
      }
    }

    const elixiaRows = articles.map((row) => mapElixiaRow(row, rubroNameById));
    const posRows = articles.map((row) => mapPosRow(row, rubroNameById));

    writeCsv(path.join(outDir, '01_rubros_elixia.csv'), ELIXIA_RUBRO_COLUMNS, rubros);
    writeCsv(path.join(outDir, '02_articulos_artsxls_elixia.csv'), ELIXIA_ARTS_COLUMNS, elixiaRows);
    writeCsv(path.join(outDir, '03_productos_pos.csv'), POS_COLUMNS, posRows);
    writeCsv(
      path.join(outDir, '04_articulos_excluidos.csv'),
      ['IDArt', 'Articulo', 'Motivo', 'PrecioCosto', 'PVMin'],
      excludedRows,
    );

    const sqlArtCount = articles.filter((r) => cleanText(r.sql_descripcion)).length;

    const stats = {
      rubros: rubros.length,
      articles: articles.length,
      excluded: excludedRows.length,
      totalBeforeFilter: allArticles.length,
      withRealName: articles.filter((r) => !isPlaceholderName(deriveName(r))).length,
      sqlArtCount,
      withSalePrice: elixiaRows.filter((r) => cleanText(r.PVMin) !== '' && toNumber(r.PVMin) > 0).length,
      withStock: posRows.filter((r) => toNumber(r.Stock) > 0).length,
      withBarcode: elixiaRows.filter((r) => cleanText(r.CodBarra) !== '').length,
      warnings: [],
    };

    if (stats.excluded > 0) {
      stats.warnings.push(
        `Se excluyeron ${stats.excluded} artículos sin nombre coherente. Ver 04_articulos_excluidos.csv.`,
      );
    }
    if (sqlArtCount > 0 && sqlArtCount < stats.articles) {
      stats.warnings.push(
        `Catálogo SQL aporta ${sqlArtCount} nombres reales; ${stats.articles - sqlArtCount} artículos del Access local siguen sin nombre en SQL.`,
      );
    } else if (stats.withRealName < stats.articles * 0.1) {
      stats.warnings.push(
        'La exportación no incluyó el catálogo maestro de artículos (nombres). Muchos productos usan código o placeholder.',
      );
    }
    if (rubros.every((r) => r['Descripción'].startsWith('Rubro '))) {
      stats.warnings.push(
        'No se exportaron rubros reales (rubros_articulos_mdb.csv vacío). Reexportá esa tabla desde Elixia o completá 01_rubros_elixia.csv a mano.',
      );
    }
    if (stats.withSalePrice < stats.articles * 0.2) {
      stats.warnings.push(
        'Pocos precios de venta en ArtsXLS; se estimaron desde ventas históricas (TVentasXArt) o etiquetas de góndola cuando existían.',
      );
    }

    writeReadme(outDir, stats);

    console.log('Export listo en:', outDir);
    console.log(`  Rubros: ${stats.rubros}`);
    console.log(`  Artículos exportados: ${stats.articles}`);
    console.log(`  Excluidos (nombre raro): ${stats.excluded}`);
    console.log(`  Con nombre real: ${stats.withRealName}`);
    console.log(`  Con precio venta: ${stats.withSalePrice}`);
    console.log(`  Con stock > 0: ${stats.withStock}`);
    console.log(`  Con código de barras: ${stats.withBarcode}`);
    if (stats.warnings.length) {
      console.log('\nAdvertencias:');
      stats.warnings.forEach((w) => console.log(`  - ${w}`));
    }
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
