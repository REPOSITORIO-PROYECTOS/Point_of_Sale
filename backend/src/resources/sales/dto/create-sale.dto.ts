import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const PAYMENT_TYPES = ['cash', 'card', 'transfer', 'qr'] as const;

export class SaleItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @Type(() => Number)
  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @Type(() => Number)
  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;
}

export class SalePaymentDto {
  @ApiProperty({ enum: PAYMENT_TYPES })
  @IsIn(PAYMENT_TYPES)
  type!: (typeof PAYMENT_TYPES)[number];

  @Type(() => Number)
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsString()
  label!: string;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @Type(() => Number)
  @ApiProperty()
  @IsNumber()
  @Min(0)
  total!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiPropertyOptional({ type: [SalePaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments?: SalePaymentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherType?: string;
}
