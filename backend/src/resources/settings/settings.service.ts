import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSettingsEntity } from './business-settings.entity';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { UpdateThemeSettingsDto } from './dto/update-theme-settings.dto';
import { LogoStorageService, THEME_LOGO_API_PATH } from './logo-storage.service';
import { PrinterSettingsEntity } from './printer-settings.entity';
import { ThemeSettingsEntity } from './theme-settings.entity';
import type { UpdatePrinterSettingsDto } from './dto/update-printer-settings.dto';

const DEFAULT_THEME_ID = 'default';
const DEFAULT_PRINTER_ID = 'default';
const DEFAULT_BUSINESS_ID = 'default';
const DEFAULT_PRIMARY_COLOR = '#030213';
const DEFAULT_RECEIPT_WIDTH_MM = 80;

export type ThemeSettingsResponse = {
  primaryColor: string;
  logoUrl?: string;
  receiptWidthMm: 55 | 80;
};

export type BusinessSettingsResponse = {
  businessName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  parcelsEnabled: boolean;
};

export type PrinterSettingsResponse = {
  printerName?: string | null;
  printMode: 'escpos' | 'html';
  printSilent: boolean;
  printerType: 'epson' | 'star' | 'tanca' | 'daruma' | 'brother' | 'custom';
  fallbackHtml: boolean;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ThemeSettingsEntity)
    private readonly themeRepo: Repository<ThemeSettingsEntity>,
    @InjectRepository(BusinessSettingsEntity)
    private readonly businessRepo: Repository<BusinessSettingsEntity>,
    @InjectRepository(PrinterSettingsEntity)
    private readonly printerRepo: Repository<PrinterSettingsEntity>,
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

  private toBusinessResponse(row: BusinessSettingsEntity | null): BusinessSettingsResponse {
    if (!row) {
      return { parcelsEnabled: false };
    }

    return {
      ...(row.businessName ? { businessName: row.businessName } : {}),
      ...(row.taxId ? { taxId: row.taxId } : {}),
      ...(row.phone ? { phone: row.phone } : {}),
      ...(row.email ? { email: row.email } : {}),
      ...(row.address ? { address: row.address } : {}),
      parcelsEnabled: row.parcelsEnabled,
    };
  }

  async getBusiness(): Promise<BusinessSettingsResponse> {
    const row = await this.businessRepo.findOne({ where: { id: DEFAULT_BUSINESS_ID } });
    return this.toBusinessResponse(row);
  }

  private toPrinterResponse(row: PrinterSettingsEntity | null): PrinterSettingsResponse {
    const printerType = row?.printerType ?? 'epson';
    const allowedTypes = ['epson', 'star', 'tanca', 'daruma', 'brother', 'custom'] as const;
    const normalizedType = allowedTypes.includes(printerType as (typeof allowedTypes)[number])
      ? (printerType as (typeof allowedTypes)[number])
      : 'epson';

    return {
      printerName: row?.printerName ?? null,
      printMode: row?.printMode === 'html' ? 'html' : 'escpos',
      printSilent: Boolean(row?.printSilent),
      printerType: normalizedType,
      fallbackHtml: row?.fallbackHtml !== 0,
    };
  }

  async getPrinter(): Promise<PrinterSettingsResponse> {
    const row = await this.printerRepo.findOne({ where: { id: DEFAULT_PRINTER_ID } });
    return this.toPrinterResponse(row);
  }

  async updatePrinter(payload: UpdatePrinterSettingsDto): Promise<PrinterSettingsResponse> {
    const existing = await this.printerRepo.findOne({ where: { id: DEFAULT_PRINTER_ID } });

    const row = this.printerRepo.create({
      id: DEFAULT_PRINTER_ID,
      printerName:
        payload.printerName === undefined ? (existing?.printerName ?? null) : payload.printerName,
      printMode: payload.printMode ?? existing?.printMode ?? 'escpos',
      printSilent:
        payload.printSilent === undefined
          ? (existing?.printSilent ?? 0)
          : payload.printSilent
            ? 1
            : 0,
      printerType: payload.printerType ?? existing?.printerType ?? 'epson',
      fallbackHtml:
        payload.fallbackHtml === undefined
          ? (existing?.fallbackHtml ?? 1)
          : payload.fallbackHtml
            ? 1
            : 0,
    });

    const saved = await this.printerRepo.save(row);
    return this.toPrinterResponse(saved);
  }

  async updateBusiness(payload: UpdateBusinessSettingsDto): Promise<BusinessSettingsResponse> {
    const existing = await this.businessRepo.findOne({ where: { id: DEFAULT_BUSINESS_ID } });

    const row = this.businessRepo.create({
      id: DEFAULT_BUSINESS_ID,
      businessName: payload.businessName ?? existing?.businessName ?? null,
      taxId: payload.taxId ?? existing?.taxId ?? null,
      phone: payload.phone ?? existing?.phone ?? null,
      email: payload.email ?? existing?.email ?? null,
      address: payload.address ?? existing?.address ?? null,
      parcelsEnabled: payload.parcelsEnabled ?? existing?.parcelsEnabled ?? false,
    });

    const saved = await this.businessRepo.save(row);
    return this.toBusinessResponse(saved);
  }
}
