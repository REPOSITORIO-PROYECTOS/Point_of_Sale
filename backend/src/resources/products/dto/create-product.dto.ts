import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PRODUCT_UNITS } from '../product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Cafe molido' })
  @IsString()
  name!: string;

  @Type(() => Number)
  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    description: 'Si es true, el precio se ingresa al vender (producto de ajuste)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  openPrice?: boolean;

  @Type(() => Number)
  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiProperty({ example: ['Cafetería', 'Bebidas'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categories!: string[];

  @Type(() => Number)
  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @Type(() => Number)
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: ['7891234567890'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  barcodes?: string[];

  @ApiPropertyOptional({ enum: PRODUCT_UNITS, default: 'unidad' })
  @IsOptional()
  @IsIn(PRODUCT_UNITS)
  unit?: (typeof PRODUCT_UNITS)[number];

  @Type(() => Number)
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Distribuidora Norte' })
  @IsOptional()
  @IsString()
  supplier?: string;
}
