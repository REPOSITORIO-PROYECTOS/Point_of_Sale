import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class GenerateAfipCsrDto {
  @ApiProperty({ example: '20123456789' })
  @IsString()
  @MinLength(11)
  cuit!: string;

  @ApiProperty({ example: 'Mi Empresa', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  organization?: string;

  @ApiProperty({ example: 'PointOfSale', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  commonName?: string;

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
