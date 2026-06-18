import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { KeyObject } from 'node:crypto';
import { Repository } from 'typeorm';
import { env } from '@/config/env.config';
import { LicenseSettingsEntity } from './license-settings.entity';
import { loadPublicKey, maskClientNumber, verifyLicenseKey } from './license-crypto';
import type { LicensePayload } from './license-payload';
import { LICENSE_FEATURES } from './license-payload';
import type { LicenseActivationResponse, LicenseStatus, LicenseStatusResponse } from './license.types';
import { MachineIdentityService } from './machine-identity.service';

const REVALIDATE_INTERVAL_MS = 60 * 60 * 1000;
const SETTINGS_ID = 'default';

@Injectable()
export class LicenseService implements OnModuleInit {
  private readonly logger = new Logger(LicenseService.name);
  private readonly publicKey: KeyObject;
  private cachedValidation: { checkedAt: number; allowed: boolean; message: string | null } | null =
    null;

  constructor(
    @InjectRepository(LicenseSettingsEntity)
    private readonly settingsRepository: Repository<LicenseSettingsEntity>,
    private readonly machineIdentityService: MachineIdentityService,
  ) {
    this.publicKey = loadPublicKey(env.licensePublicKeyPath);
  }

  async onModuleInit() {
    await this.ensureSettingsRow();
    await this.revalidateCached();
  }

  async getMachineId(): Promise<string> {
    return this.machineIdentityService.getMachineId();
  }

  async getStatus(): Promise<LicenseStatusResponse> {
    const settings = await this.getSettings();
    const machineId = await this.getMachineId();
    const validation = await this.evaluateStoredLicense(settings, machineId);

    return {
      status: validation.status,
      allowed: validation.allowed,
      clientNumber: validation.allowed ? settings.clientNumber : null,
      clientNumberMasked: settings.clientNumber ? maskClientNumber(settings.clientNumber) : null,
      licenseId: settings.licenseId,
      activatedAt: settings.activatedAt?.toISOString() ?? null,
      expiresAt: settings.expiresAt?.toISOString() ?? null,
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

    return {
      status: 'active',
      clientNumber: verification.payload.clientNumber,
      licenseId: verification.payload.licenseId,
      expiresAt: verification.payload.expiresAt,
    };
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
