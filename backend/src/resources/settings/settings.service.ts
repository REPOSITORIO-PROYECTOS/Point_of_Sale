import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateThemeSettingsDto } from './dto/update-theme-settings.dto';
import { LogoStorageService, THEME_LOGO_API_PATH } from './logo-storage.service';
import { ThemeSettingsEntity } from './theme-settings.entity';

const DEFAULT_THEME_ID = 'default';
const DEFAULT_PRIMARY_COLOR = '#030213';
const DEFAULT_RECEIPT_WIDTH_MM = 80;

export type ThemeSettingsResponse = {
  primaryColor: string;
  logoUrl?: string;
  receiptWidthMm: 55 | 80;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ThemeSettingsEntity)
    private readonly themeRepo: Repository<ThemeSettingsEntity>,
    private readonly logoStorage: LogoStorageService,
  ) {}

  private normalizeReceiptWidth(value: number | null | undefined): 55 | 80 {
    return value === 55 ? 55 : 80;
  }

  private toResponse(row: ThemeSettingsEntity): ThemeSettingsResponse {
    const response: ThemeSettingsResponse = {
      primaryColor: row.primaryColor,
      receiptWidthMm: this.normalizeReceiptWidth(row.receiptWidthMm),
    };

    if (row.logoUrl && this.logoStorage.hasStoredLogo()) {
      response.logoUrl = THEME_LOGO_API_PATH;
    }

    return response;
  }

  private async migrateLegacyLogoIfNeeded(row: ThemeSettingsEntity | null): Promise<ThemeSettingsEntity | null> {
    if (!row?.logoUrl) {
      return row;
    }

    const migratedPath = this.logoStorage.migrateLegacyLogoReference(row.logoUrl);
    if (migratedPath === row.logoUrl) {
      return row;
    }

    row.logoUrl = migratedPath;
    return this.themeRepo.save(row);
  }

  async getTheme(): Promise<ThemeSettingsResponse> {
    let row = await this.themeRepo.findOne({ where: { id: DEFAULT_THEME_ID } });
    row = await this.migrateLegacyLogoIfNeeded(row);

    if (!row) {
      return {
        primaryColor: DEFAULT_PRIMARY_COLOR,
        receiptWidthMm: DEFAULT_RECEIPT_WIDTH_MM,
      };
    }

    return this.toResponse(row);
  }

  async updateTheme(payload: UpdateThemeSettingsDto): Promise<ThemeSettingsResponse> {
    const existing = await this.themeRepo.findOne({ where: { id: DEFAULT_THEME_ID } });
    const nextLogoUrl =
      payload.logoUrl === null
        ? null
        : existing?.logoUrl && this.logoStorage.hasStoredLogo()
          ? THEME_LOGO_API_PATH
          : (existing?.logoUrl ?? null);

    if (payload.logoUrl === null) {
      this.logoStorage.clearStoredLogo();
    }

    const row = this.themeRepo.create({
      id: DEFAULT_THEME_ID,
      primaryColor: payload.primaryColor,
      logoUrl: nextLogoUrl,
      receiptWidthMm: payload.receiptWidthMm ?? this.normalizeReceiptWidth(existing?.receiptWidthMm),
    });
    const saved = await this.themeRepo.save(row);
    return this.toResponse(saved);
  }

  async uploadLogoFromBuffer(buffer: Buffer, mimeType: string): Promise<ThemeSettingsResponse> {
    this.logoStorage.saveLogoBuffer(buffer, mimeType);

    const existing = await this.themeRepo.findOne({ where: { id: DEFAULT_THEME_ID } });
    const row = this.themeRepo.create({
      id: DEFAULT_THEME_ID,
      primaryColor: existing?.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      logoUrl: THEME_LOGO_API_PATH,
      receiptWidthMm: this.normalizeReceiptWidth(existing?.receiptWidthMm),
    });
    const saved = await this.themeRepo.save(row);
    return this.toResponse(saved);
  }

  async uploadLogoFromBase64(imageBase64: string): Promise<ThemeSettingsResponse> {
    this.logoStorage.saveLogoFromDataUrl(imageBase64);

    const existing = await this.themeRepo.findOne({ where: { id: DEFAULT_THEME_ID } });
    const row = this.themeRepo.create({
      id: DEFAULT_THEME_ID,
      primaryColor: existing?.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      logoUrl: THEME_LOGO_API_PATH,
      receiptWidthMm: this.normalizeReceiptWidth(existing?.receiptWidthMm),
    });
    const saved = await this.themeRepo.save(row);
    return this.toResponse(saved);
  }

  async deleteLogo(): Promise<ThemeSettingsResponse> {
    this.logoStorage.clearStoredLogo();

    const existing = await this.themeRepo.findOne({ where: { id: DEFAULT_THEME_ID } });
    if (!existing) {
      return {
        primaryColor: DEFAULT_PRIMARY_COLOR,
        receiptWidthMm: DEFAULT_RECEIPT_WIDTH_MM,
      };
    }

    existing.logoUrl = null;
    const saved = await this.themeRepo.save(existing);
    return this.toResponse(saved);
  }

  getLogoFile() {
    const stored = this.logoStorage.findStoredLogo();
    if (!stored) {
      throw new NotFoundException('Logo no configurado');
    }

    return stored;
  }
}
