import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ActivateLicenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  licenseKey!: string;
}
