import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { KeyObject } from 'node:crypto';
import { Repository } from 'typeorm';
import { env } from '@/config/env.config';
import { AuditLogService } from '@/services/audit-log.service';
import { LicenseSettingsEntity } from './license-settings.entity';
import { loadPublicKey, maskClientNumber, verifyLicenseKey } from './license-crypto';
import { LoginAttemptTracker } from './login-attempt-tracker';
import type { LicensePayload } from './license-payload';
import { LICENSE_FEATURES } from './license-payload';
import type { LicenseActivationResponse, LicenseStatus, LicenseStatusResponse } from './license.types';
import { MachineIdentityService } from './machine-identity.service';

const REVALIDATE_INTERVAL_MS = 60 * 60 * 1000;
const DAILY_REVALIDATE_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 7;
const EXPIRY_WARNING_DAYS = 7;
const SETTINGS_ID = 'default';

@Injectable()
export class LicenseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LicenseService.name);
  private readonly publicKey: KeyObject;
  private readonly loginAttempts = new LoginAttemptTracker();
  private cachedValidation: { checkedAt: number; allowed: boolean; message: string | null } | null =
    null;
  private validationTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(LicenseSettingsEntity)
    private readonly settingsRepository: Repository<LicenseSettingsEntity>,
    @Inject(MachineIdentityService)
    private readonly machineIdentityService: MachineIdentityService,
    @Inject(AuditLogService)
    private readonly auditLog: AuditLogService,
  ) {
    this.publicKey = loadPublicKey(env.licensePublicKeyPath);
  }

  async onModuleInit() {
    await this.ensureSettingsRow();
    await this.revalidateCached();
    this.validationTimer = setInterval(() => {
      void this.revalidateCached();
    }, DAILY_REVALIDATE_MS);
  }

  onModuleDestroy() {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }
  }

  async getMachineId(): Promise<string> {
    return this.machineIdentityService.getMachineId();
  }

  async getStatus(): Promise<LicenseStatusResponse> {
    const settings = await this.getSettings();
    const machineId = await this.getMachineId();
    const validation = await this.evaluateStoredLicense(settings, machineId);
    const grace = this.computeGrace(settings);

    let daysUntilExpiry: number | null = null;
    let showExpiryWarning = false;
    if (settings.expiresAt && validation.status === 'active') {
      const now = Date.now();
      daysUntilExpiry = Math.ceil((settings.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000));
      showExpiryWarning = daysUntilExpiry <= EXPIRY_WARNING_DAYS && daysUntilExpiry >= 0;
    }

    return {
      status: validation.status,
      allowed: validation.allowed,
      clientNumber: validation.allowed ? settings.clientNumber : null,
      clientNumberMasked: settings.clientNumber ? maskClientNumber(settings.clientNumber) : null,
      licenseId: settings.licenseId,
      activatedAt: settings.activatedAt?.toISOString() ?? null,
      expiresAt: settings.expiresAt?.toISOString() ?? null,
      firstBootAt: settings.firstBootAt.toISOString(),
      graceEndsAt: grace.graceEndsAt.toISOString(),
      inGracePeriod: grace.inGracePeriod,
      daysUntilExpiry,
      showExpiryWarning,
      cautionFlag: settings.cautionFlag,
      machineId,
      message: validation.message,
    };
  }

  async activate(licenseKey: string): Promise<LicenseActivationResponse> {
    const machineId = await this.getMachineId();
    const verification = verifyLicenseKey(licenseKey, this.publicKey, machineId);

    if (!verification.valid || !verification.payload) {
      throw new ForbiddenException(verification.reason ?? 'Licencia inválida');
    }

    const settings = await this.getSettings();
    const now = new Date();

    settings.licenseKey = licenseKey.trim();
    settings.licenseId = verification.payload.licenseId;
    settings.clientNumber = verification.payload.clientNumber;
    settings.activatedAt = now;
    settings.expiresAt = verification.payload.expiresAt
      ? new Date(verification.payload.expiresAt)
      : null;
    settings.status = 'active';
    settings.cautionFlag = false;

    await this.settingsRepository.save(settings);
    this.cachedValidation = { checkedAt: Date.now(), allowed: true, message: null };

    this.auditLog.record({
      action: 'license.activate',
      licenseId: verification.payload.licenseId,
      clientNumber: verification.payload.clientNumber,
    });

    return {
      status: 'active',
      clientNumber: verification.payload.clientNumber,
      licenseId: verification.payload.licenseId,
      expiresAt: verification.payload.expiresAt,
    };
  }

  async recordFailedLogin(ip: string) {
    const result = this.loginAttempts.recordFailure(ip);
    if (!result.caution) {
      return;
    }

    const settings = await this.getSettings();
    if (settings.cautionFlag) {
      return;
    }

    settings.cautionFlag = true;
    await this.settingsRepository.save(settings);
    this.cachedValidation = null;

    this.auditLog.record({
      action: 'license.misuse.caution',
      ip,
      failedAttempts: result.count,
    });
    this.logger.warn(`Caution flag activado por intentos de login desde ${ip}`);
  }

  clearLoginAttempts(ip: string) {
    this.loginAttempts.reset(ip);
  }

  async assertLicensed(): Promise<void> {
    if (env.devSkipLicense) {
      return;
    }

    const now = Date.now();
    if (this.cachedValidation && now - this.cachedValidation.checkedAt < REVALIDATE_INTERVAL_MS) {
      if (!this.cachedValidation.allowed) {
        throw new ForbiddenException(this.cachedValidation.message ?? 'Licencia no válida');
      }
      return;
    }

    const settings = await this.getSettings();
    const machineId = await this.getMachineId();
    const validation = await this.evaluateStoredLicense(settings, machineId);
    this.cachedValidation = {
      checkedAt: now,
      allowed: validation.allowed,
      message: validation.message,
    };

    if (!validation.allowed) {
      throw new ForbiddenException(validation.message ?? 'Licencia no válida');
    }
  }

  private async revalidateCached() {
    const settings = await this.getSettings();
    const machineId = await this.getMachineId();
    const validation = await this.evaluateStoredLicense(settings, machineId);
    this.cachedValidation = {
      checkedAt: Date.now(),
      allowed: validation.allowed,
      message: validation.message,
    };
  }

  private async evaluateStoredLicense(
    settings: LicenseSettingsEntity,
    machineId: string,
  ): Promise<{ allowed: boolean; status: LicenseStatus; message: string | null }> {
    if (env.devSkipLicense) {
      return { allowed: true, status: 'active', message: null };
    }

    if (!settings.licenseKey) {
      const grace = this.computeGrace(settings);
      if (grace.inGracePeriod) {
        return {
          allowed: true,
          status: 'missing',
          message: `Período de gracia: activar licencia antes del ${grace.graceEndsAt.toISOString().slice(0, 10)}`,
        };
      }

      return {
        allowed: false,
        status: 'missing',
        message: 'Se requiere activar una licencia válida',
      };
    }

    const verification = verifyLicenseKey(settings.licenseKey, this.publicKey, machineId);
    if (!verification.valid || !verification.payload) {
      const status: LicenseStatus =
        verification.reason === 'Licencia expirada' ? 'expired' : 'blocked';

      if (settings.status !== status) {
        settings.status = status;
        await this.settingsRepository.save(settings);
      }

      return {
        allowed: false,
        status,
        message: verification.reason ?? 'Licencia inválida',
      };
    }

    if (settings.status !== 'active') {
      settings.status = 'active';
      settings.licenseId = verification.payload.licenseId;
      settings.clientNumber = verification.payload.clientNumber;
      settings.expiresAt = verification.payload.expiresAt
        ? new Date(verification.payload.expiresAt)
        : null;
      await this.settingsRepository.save(settings);
    }

    return { allowed: true, status: 'active', message: null };
  }

  private async ensureSettingsRow() {
    const existing = await this.settingsRepository.findOne({ where: { id: SETTINGS_ID } });
    if (existing) {
      return;
    }

    await this.settingsRepository.save({
      id: SETTINGS_ID,
      licenseKey: null,
      licenseId: null,
      clientNumber: null,
      activatedAt: null,
      expiresAt: null,
      status: 'missing',
      firstBootAt: new Date(),
      cautionFlag: false,
    });
  }

  private getSettings() {
    return this.settingsRepository.findOneOrFail({ where: { id: SETTINGS_ID } });
  }

  private computeGrace(settings: LicenseSettingsEntity) {
    const graceEndsAt = new Date(
      settings.firstBootAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
    const inGracePeriod = !settings.licenseKey && Date.now() < graceEndsAt.getTime();
    return { graceEndsAt, inGracePeriod };
  }
}

export function buildLicensePayload(input: {
  licenseId: string;
  clientNumber: string;
  machineId: string;
  expiresAt?: string | null;
  features?: LicensePayload['features'];
}): LicensePayload {
  return {
    v: 1,
    licenseId: input.licenseId,
    clientNumber: input.clientNumber,
    machineId: input.machineId,
    issuedAt: new Date().toISOString(),
    expiresAt: input.expiresAt ?? null,
    features: input.features?.length ? input.features : [...LICENSE_FEATURES],
  };
}
