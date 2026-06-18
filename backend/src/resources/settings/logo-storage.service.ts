import { BadRequestException, Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { getDesktopPaths } from '../../config/desktop-paths';

export const THEME_LOGO_API_PATH = '/settings/theme/logo';
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export type StoredLogo = {
  absolutePath: string;
  contentType: string;
  buffer: Buffer;
};

@Injectable()
export class LogoStorageService {
  private getBrandingDir(): string {
    const { brandingDir } = getDesktopPaths();
    fs.mkdirSync(brandingDir, { recursive: true });
    return brandingDir;
  }

  isDataUrl(value: string): boolean {
    return value.startsWith('data:image/');
  }

  isApiLogoPath(value: string): boolean {
    return value === THEME_LOGO_API_PATH || value.endsWith(THEME_LOGO_API_PATH);
  }

  findStoredLogo(): StoredLogo | null {
    const brandingDir = this.getBrandingDir();

    for (const extension of ['png', 'jpg', 'jpeg', 'webp']) {
      const absolutePath = path.join(brandingDir, `logo.${extension}`);
      if (!fs.existsSync(absolutePath)) {
        continue;
      }

      const buffer = fs.readFileSync(absolutePath);
      const contentType = MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
      return { absolutePath, contentType, buffer };
    }

    return null;
  }

  hasStoredLogo(): boolean {
    return this.findStoredLogo() !== null;
  }

  clearStoredLogo(): void {
    const brandingDir = this.getBrandingDir();

    for (const extension of ['png', 'jpg', 'jpeg', 'webp']) {
      const absolutePath = path.join(brandingDir, `logo.${extension}`);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }
  }

  saveLogoBuffer(buffer: Buffer, mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Formato de imagen no permitido. Use PNG, JPEG o WebP.');
    }

    if (buffer.byteLength > MAX_LOGO_BYTES) {
      throw new BadRequestException('El logo no puede superar 2 MB.');
    }

    const extension = EXTENSION_BY_MIME[mimeType];
    if (!extension) {
      throw new BadRequestException('Formato de imagen no permitido. Use PNG, JPEG o WebP.');
    }

    this.clearStoredLogo();
    const brandingDir = this.getBrandingDir();
    fs.writeFileSync(path.join(brandingDir, `logo.${extension}`), buffer);
  }

  saveLogoFromDataUrl(dataUrl: string): void {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i.exec(dataUrl);
    if (!match) {
      throw new BadRequestException('Data URL de logo inválida.');
    }

    const mimeType = match[1].toLowerCase();
    const buffer = Buffer.from(match[2], 'base64');
    this.saveLogoBuffer(buffer, mimeType);
  }

  migrateLegacyLogoReference(logoUrl: string | null | undefined): string | null {
    if (!logoUrl) {
      return null;
    }

    if (this.isApiLogoPath(logoUrl)) {
      return this.hasStoredLogo() ? THEME_LOGO_API_PATH : null;
    }

    if (this.isDataUrl(logoUrl)) {
      this.saveLogoFromDataUrl(logoUrl);
      return THEME_LOGO_API_PATH;
    }

    return null;
  }
}
