import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { UserEntity } from '@/auth/user.entity';
import { env } from '@/config/env.config';
import { LicenseService } from '@/license/license.service';
import { ProductEntity } from '@/resources/products/product.entity';
import { SaleEntity } from '@/resources/sales/sale.entity';
import { ThemeSettingsEntity } from '@/resources/settings/theme-settings.entity';
import { AuditLogService } from '@/services/audit-log.service';

const TOKEN_TTL_MS = 15 * 60 * 1000;
const RECOVERY_KEY_HEADER = 'x-support-recovery-key';
const RECOVERY_TOKEN_HEADER = 'x-support-recovery-token';

type RecoverySession = {
  expiresAt: number;
};

export type RecoveryUnlockResponse = {
  recoveryToken: string;
  expiresAt: string;
};

@Injectable()
export class SupportRecoveryService {
  private readonly sessions = new Map<string, RecoverySession>();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly licenseService: LicenseService,
  ) {}

  isRecoveryEnabled(): boolean {
    const secret = process.env.SUPPORT_RECOVERY_SECRET;
    return Boolean(secret && secret.length >= 32);
  }

  assertRecoveryEnabled() {
    if (!this.isRecoveryEnabled()) {
      throw new ServiceUnavailableException('Modo de recuperación deshabilitado');
    }
  }

  verifyRecoveryKey(headerValue: string | undefined): boolean {
    this.assertRecoveryEnabled();
    if (!headerValue) {
      return false;
    }

    const secret = process.env.SUPPORT_RECOVERY_SECRET;
    if (!secret) {
      return false;
    }

    const expected = createHash('sha256').update(secret).digest();
    const received = createHash('sha256').update(headerValue).digest();
    return timingSafeEqual(expected, received);
  }

  unlock(recoveryKey: string): RecoveryUnlockResponse {
    if (!this.verifyRecoveryKey(recoveryKey)) {
      throw new UnauthorizedException('Clave de recuperación inválida');
    }

    const recoveryToken = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    this.sessions.set(recoveryToken, { expiresAt });
    this.pruneExpiredSessions();

    this.auditLog.record({ action: 'support.recovery.unlock' });

    return {
      recoveryToken,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  assertValidRecoveryToken(token: string | undefined) {
    this.assertRecoveryEnabled();
    if (!token) {
      throw new UnauthorizedException('Token de recuperación requerido');
    }

    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      this.sessions.delete(token ?? '');
      throw new UnauthorizedException('Token de recuperación inválido o expirado');
    }
  }

  async getDiagnostics() {
    const usersCount = await this.dataSource.getRepository(UserEntity).count();
    const licenseStatus = await this.licenseService.getStatus();

    this.auditLog.record({ action: 'support.recovery.diagnostics' });

    return {
      dbPath: env.sqliteDbPath,
      schemaVersion: 'typeorm-sync',
      licenseStatus: licenseStatus.status,
      licenseAllowed: licenseStatus.allowed,
      userCount: usersCount,
      nodeEnv: env.nodeEnv,
      appDataDir: env.appDataDir,
      lastSync: null,
    };
  }

  async exportJson() {
    const users = await this.dataSource.getRepository(UserEntity).find();
    const products = await this.dataSource.getRepository(ProductEntity).find();
    const sales = await this.dataSource.getRepository(SaleEntity).find({
      order: { timestamp: 'DESC' },
      take: 500,
    });
    const theme = await this.dataSource.getRepository(ThemeSettingsEntity).find();

    const salesSummary = {
      totalRecords: await this.dataSource.getRepository(SaleEntity).count(),
      recentSales: sales.map((sale) => ({
        id: sale.id,
        total: sale.total,
        timestamp: sale.timestamp,
        userId: sale.userId,
        voucherType: sale.voucherType,
      })),
    };

    this.auditLog.record({ action: 'support.recovery.export', format: 'json' });

    return {
      exportedAt: new Date().toISOString(),
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })),
      products,
      salesSummary,
      settings: {
        theme,
        afipPrivateKeysIncluded: false,
      },
    };
  }

  streamSqliteBackup(response: Response) {
    const dbPath = env.sqliteDbPath;
    if (!existsSync(dbPath)) {
      throw new NotFoundException('Base de datos no encontrada');
    }

    this.auditLog.record({ action: 'support.recovery.export', format: 'sqlite' });

    const filename = `pos-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return new Promise<void>((resolve, reject) => {
      const stream = createReadStream(dbPath);
      stream.on('error', reject);
      stream.on('end', () => resolve());
      stream.pipe(response);
    });
  }

  async resetAdmin(username: string, password: string) {
    if (!username.trim() || password.length < 8) {
      throw new BadRequestException('Usuario y contraseña (mín. 8 caracteres) requeridos');
    }

    const usersRepo = this.dataSource.getRepository(UserEntity);
    const passwordHash = await bcrypt.hash(password, 10);
    const adminId = `user-admin-recovery-${Date.now()}`;

    let admin = await usersRepo.findOne({ where: { role: 'admin' } });
    if (admin) {
      admin.username = username.trim();
      admin.passwordHash = passwordHash;
      admin.isActive = true;
    } else {
      admin = usersRepo.create({
        id: adminId,
        username: username.trim(),
        passwordHash,
        role: 'admin',
        isActive: true,
      });
    }

    await usersRepo.save(admin);

    this.auditLog.record({
      action: 'support.recovery.reset-admin',
      username: admin.username,
    });

    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    };
  }

  private pruneExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }
}

export const SUPPORT_RECOVERY_HEADERS = {
  key: RECOVERY_KEY_HEADER,
  token: RECOVERY_TOKEN_HEADER,
} as const;

export function readRecoveryKey(headers: Record<string, string | string[] | undefined>): string | undefined {
  const value = headers[RECOVERY_KEY_HEADER] ?? headers[RECOVERY_KEY_HEADER.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function readRecoveryToken(headers: Record<string, string | string[] | undefined>): string | undefined {
  const value = headers[RECOVERY_TOKEN_HEADER] ?? headers[RECOVERY_TOKEN_HEADER.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}
