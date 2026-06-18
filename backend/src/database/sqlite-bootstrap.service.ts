import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserEntity } from '../auth/user.entity';

const DEFAULT_ADMIN_ID = 'user-admin';
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

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

    await this.seedDefaultAdmin();

    this.logger.log('SQLite configurada para uso local de escritorio');
  }

  private async seedDefaultAdmin() {
    const usersRepository = this.dataSource.getRepository(UserEntity);
    const existing = await usersRepository.findOne({
      where: { username: DEFAULT_ADMIN_USERNAME },
    });

    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await usersRepository.save({
      id: DEFAULT_ADMIN_ID,
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      role: 'admin',
      isActive: true,
    });

    this.logger.warn(
      `Usuario admin creado (solo dev): ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`,
    );
  }
}
