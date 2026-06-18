import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ImportAfipCertificateDto {
  @ApiProperty({ description: 'Contenido PEM del certificado AFIP (.crt) aprobado' })
  @IsString()
  @MinLength(20)
  certificado!: string;
}
