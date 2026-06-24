import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildCierreLoteHtml, buildEgresoHtml, buildReceiptHtml } from '../frontend/src/lib/receipt-template';

const outDir = path.join(process.cwd(), 'docs', 'previews', 'receipts');
const sampleDate = new Date('2026-06-24T14:30:00');

const sampleItems = [
  { name: 'Café espresso', quantity: 2, price: 3.5 },
  { name: 'Medialuna', quantity: 3, price: 1.2 },
  { name: 'Agua mineral 500ml', quantity: 1, price: 2.8 },
];

const subtotal = sampleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
const discount = 1.5;
const total = subtotal - discount;

const payments = [
  { type: 'cash', amount: 15, label: 'Efectivo' },
  { type: 'card', amount: Math.max(0, total - 15), label: 'Tarjeta débito' },
];

function findChromeExecutable(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function htmlToPdf(browserPath: string, htmlPath: string, pdfPath: string) {
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  execSync(
    `"${browserPath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${fileUrl}"`,
    { stdio: 'pipe' },
  );
}

fs.mkdirSync(outDir, { recursive: true });

const variants = [
  {
    label: 'Recibo / Comprobante (recibo.html)',
    file: 'recibo',
    html: buildReceiptHtml(sampleItems, total, {
      widthMm: 80,
      businessName: 'Cafetería Demo',
      voucherType: 'comprobante',
      timestamp: sampleDate,
      ticketId: '1740000123456',
      subtotal,
      adjustments: [{ type: 'discount', label: 'Promo happy hour', amount: discount }],
      payments,
    }),
  },
  {
    label: 'Factura (factura.html)',
    file: 'factura',
    html: buildReceiptHtml(sampleItems, total, {
      widthMm: 80,
      businessName: 'Cafetería Demo',
      voucherType: 'factura',
      timestamp: sampleDate,
      ticketId: '1740000123457',
      subtotal,
      adjustments: [{ type: 'discount', label: 'Promo happy hour', amount: discount }],
      payments,
      emisor: {
        razonSocial: 'Cafetería Demo SRL',
        cuit: '20123456789',
        domicilio: 'Av. Corrientes 1234, CABA',
        condicionIva: 'IVA Responsable Inscripto',
        puntoVenta: 1,
      },
      receptor: {
        nombreRazonSocial: 'Consumidor Final',
        cuitODni: 'S/D',
        condicionIva: 'Consumidor Final',
      },
      afip: {
        tipoAfip: 6,
        numeroComprobante: 42,
        cae: '74234567890123',
        vencimientoCae: '04/07/2026',
        neto: 8.76,
        iva: 1.84,
        ivaRateLabel: '21%',
      },
      mostrarDesgloseIva: true,
    }),
  },
  {
    label: 'Presupuesto (presupuesto.html)',
    file: 'presupuesto',
    html: buildReceiptHtml(sampleItems, total, {
      widthMm: 80,
      businessName: 'Cafetería Demo',
      voucherType: 'presupuesto',
      timestamp: sampleDate,
      subtotal,
    }),
  },
  {
    label: 'Egreso (egreso.html)',
    file: 'egreso',
    html: buildEgresoHtml({
      nombreNegocio: 'Cafetería Demo',
      fechaHora: sampleDate,
      nombreUsuario: 'María García',
      metodoPagoLabel: 'Efectivo',
      concepto: 'Compra insumos limpieza',
      monto: 4500,
      idMovimiento: 88,
      idSesion: 12,
    }),
  },
  {
    label: 'Cierre de caja (cierre_lote_detallado.html)',
    file: 'cierre-lote',
    html: buildCierreLoteHtml({
      empresa: { nombreFantasia: 'Cafetería Demo', cuit: '20123456789' },
      sesion: {
        id: 12,
        fechaApertura: new Date('2026-06-24T08:00:00'),
        fechaCierre: sampleDate,
        saldoInicial: 5000,
        saldoFinalCalculado: 18500,
        saldoFinalDeclarado: 18450,
        diferencia: -50,
      },
      usuarioApertura: 'María García',
      usuarioCierre: 'María García',
      totales: { ventas: 15000, ingresos: 500, egresos: 2000, propinas: 0 },
      desgloseMetodosPago: { efectivo: 9000, transferencia: 3000, bancario: 3000 },
      desgloseIngresos: [{ concepto: 'Fondo chico', monto: 500 }],
      desgloseEgresos: [{ concepto: 'Insumos', monto: 2000, metodoPagoLabel: 'Efectivo' }],
    }),
  },
];

const indexSections = variants
  .map(
    (variant, index) => `
    <div class="panel">
      <h2>${variant.label}</h2>
      <iframe src="${variant.file}.html" width="340" height="820" title="${variant.label}"></iframe>
    </div>`,
  )
  .join('');

const indexHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><title>Tickets POS — referencia</title>
<style>
body{margin:0;padding:24px;font-family:system-ui,sans-serif;background:#e8e8e8}
.grid{display:flex;flex-wrap:wrap;gap:24px;justify-content:center}
.panel{background:#fff;padding:16px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.12)}
.panel h2{font-size:13px;text-transform:uppercase;color:#666}
</style></head><body>
<h1>Tickets POS — plantillas alineadas a referencia Jinja</h1>
<div class="grid">${indexSections}</div></body></html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8');

variants.forEach((variant) => {
  fs.writeFileSync(path.join(outDir, `${variant.file}.html`), variant.html, 'utf8');
});

const chrome = findChromeExecutable();
const generatedPdfs: string[] = [];

if (chrome) {
  for (const variant of variants) {
    const htmlPath = path.join(outDir, `${variant.file}.html`);
    const pdfPath = path.join(outDir, `${variant.file}.pdf`);
    htmlToPdf(chrome, htmlPath, pdfPath);
    generatedPdfs.push(pdfPath);
  }
  htmlToPdf(chrome, path.join(outDir, 'index.html'), path.join(outDir, 'todos-los-tickets.pdf'));
  generatedPdfs.push(path.join(outDir, 'todos-los-tickets.pdf'));
}

console.log(JSON.stringify({ outDir, generatedPdfs }, null, 2));
