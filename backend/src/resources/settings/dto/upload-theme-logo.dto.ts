import { IsOptional, IsString, Matches } from 'class-validator';

export class UploadThemeLogoDto {
  @IsOptional()
  @IsString()
  @Matches(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i, {
    message: 'imageBase64 must be a PNG, JPEG or WebP data URL',
  })
  imageBase64?: string;
}
