import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { StockMovementType } from '../stock-movement.entity';

export class StockMovementItemDto {
  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  productId!: string;

  @Type(() => Number)
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateStockMovementDto {
  @ApiProperty({ enum: ['in', 'out', 'transfer'] })
  @IsIn(['in', 'out', 'transfer'])
  type!: StockMovementType;

  @ApiProperty({ type: [StockMovementItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockMovementItemDto)
  items!: StockMovementItemDto[];

  @ApiPropertyOptional({ example: 'Local Norte' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  destinationLocal?: string;

  @ApiPropertyOptional({ example: 'Recepción proveedor #4521' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
