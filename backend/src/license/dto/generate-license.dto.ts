import { IsISO8601, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LICENSE_FEATURES } from '../license-payload';

export class GenerateLicenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  client!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  licenseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  machineId!: string;

  @IsOptional()
  @IsISO8601()
  expires?: string;

  @IsOptional()
  @IsIn(LICENSE_FEATURES, { each: true })
  features?: (typeof LICENSE_FEATURES)[number][];
}
