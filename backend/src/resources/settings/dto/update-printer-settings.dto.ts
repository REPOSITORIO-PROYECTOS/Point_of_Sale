import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const PRINTER_TYPES = ['epson', 'star', 'tanca', 'daruma', 'brother', 'custom'] as const;

export class UpdatePrinterSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  printerName?: string | null;

  @IsOptional()
  @IsIn(['escpos', 'text', 'html'])
  printMode?: 'escpos' | 'text' | 'html';

  @IsOptional()
  @IsBoolean()
  printSilent?: boolean;

  @IsOptional()
  @IsIn(PRINTER_TYPES)
  printerType?: (typeof PRINTER_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  fallbackHtml?: boolean;
}
