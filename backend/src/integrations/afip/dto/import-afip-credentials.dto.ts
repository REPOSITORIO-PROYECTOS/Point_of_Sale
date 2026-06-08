import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ImportAfipCredentialsDto {
  @ApiProperty({ example: '20123456789' })
  @IsString()
  @MinLength(11)
  cuit!: string;

  @ApiProperty({ description: 'Contenido PEM del certificado AFIP (.crt)' })
  @IsString()
  @MinLength(20)
  certificado!: string;

  @ApiProperty({ description: 'Contenido PEM de la clave privada AFIP (.key)' })
  @IsString()
  @MinLength(20)
  clavePrivada!: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  puntoVenta?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  production?: boolean;
}
