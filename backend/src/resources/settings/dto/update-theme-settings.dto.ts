import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateThemeSettingsDto {
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor must be a hex color (#RRGGBB)' })
  primaryColor!: string;

  @IsOptional()
  @IsIn([55, 80], { message: 'receiptWidthMm must be 55 or 80' })
  receiptWidthMm?: 55 | 80;

  /** Pass null to remove logo reference (file removed via DELETE /settings/theme/logo). */
  @IsOptional()
  logoUrl?: string | null;
}
