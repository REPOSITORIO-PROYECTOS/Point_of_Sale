import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SqliteBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SqliteBootstrapService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    if (this.dataSource.options.type !== 'sqlite') {
      return;
    }

    await this.dataSource.query('PRAGMA journal_mode = WAL;');
    await this.dataSource.query('PRAGMA foreign_keys = ON;');
    await this.dataSource.query('PRAGMA busy_timeout = 5000;');

    this.logger.log('SQLite configurada para uso local de escritorio');
  }
}
