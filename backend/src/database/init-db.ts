import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { env } from '../config/env.config';
import { runSqliteLegacyMigrations } from './sqlite-legacy-migrations';

async function initDb() {
  await runSqliteLegacyMigrations(env.sqliteDbPath);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  await app.close();
  console.log('SQLite lista en', env.sqliteDbPath);
}

initDb();
