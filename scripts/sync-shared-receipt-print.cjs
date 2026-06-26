const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '../shared/receipt-print-text.ts');
const target = path.join(__dirname, '../desktop/src/receipt-print-text.ts');

fs.copyFileSync(source, target);
console.log('[sync] shared/receipt-print-text.ts → desktop/src/receipt-print-text.ts');
