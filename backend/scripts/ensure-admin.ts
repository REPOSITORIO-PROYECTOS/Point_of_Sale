import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import sqlite3 from 'sqlite3';
import { env } from '../src/config/env.config';

type UserRow = {
  id: string;
  username: string;
  role: string;
  isActive: number;
};

const username = process.argv[2] ?? 'admin';
const password = process.argv[3] ?? '123456789';

function openDb(path: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path, (error) => {
      if (error) reject(error);
      else resolve(db);
    });
  });
}

function all<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows as T[]);
    });
  });
}

function run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function main() {
  const dbPath = env.sqliteDbPath;
  const db = await openDb(dbPath);

  try {
    const users = await all<UserRow>(
      db,
      'SELECT id, username, role, isActive FROM users ORDER BY username',
    );

    console.log('BD:', dbPath);
    console.log('Usuarios actuales:', users.length ? users : '(ninguno)');

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = users.find((user) => user.username === username);

    if (existing) {
      await run(db, 'UPDATE users SET passwordHash = ?, role = ?, isActive = 1 WHERE id = ?', [
        passwordHash,
        'admin',
        existing.id,
      ]);
      console.log(`Usuario "${username}" actualizado (admin, activo, contraseña reseteada).`);
    } else {
      await run(
        db,
        'INSERT INTO users (id, username, passwordHash, role, isActive, createdAt) VALUES (?, ?, ?, ?, 1, datetime("now"))',
        [randomUUID(), username, passwordHash, 'admin'],
      );
      console.log(`Usuario "${username}" creado como admin.`);
    }

    const updated = await all<UserRow>(
      db,
      'SELECT id, username, role, isActive FROM users WHERE username = ?',
      [username],
    );
    console.log('Resultado:', updated[0]);
  } finally {
    await new Promise<void>((resolve, reject) => {
      db.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
