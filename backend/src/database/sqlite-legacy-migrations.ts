import fs from 'node:fs';
import sqlite3 from 'sqlite3';

type TableColumn = { name: string };

export async function runSqliteLegacyMigrations(dbPath: string): Promise<void> {
  if (!fs.existsSync(dbPath)) {
    return;
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    db.all(`PRAGMA table_info(sales)`, (error, columns: TableColumn[]) => {
      if (error) {
        db.close();
        reject(error);
        return;
      }

      if (!columns?.length) {
        db.close();
        resolve();
        return;
      }

      const columnNames = columns.map((column) => column.name);
      const isLegacySales =
        columnNames.includes('productId') ||
        !columnNames.includes('items') ||
        !columnNames.includes('total');

      if (!isLegacySales) {
        db.close();
        resolve();
        return;
      }

      db.run('DROP TABLE IF EXISTS sales', (dropError) => {
        db.close();
        if (dropError) {
          reject(dropError);
          return;
        }
        resolve();
      });
    });
  });
}
