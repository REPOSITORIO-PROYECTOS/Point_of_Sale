import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type {
  CashMovementPaymentMethod,
  CashMovementType,
} from '../cash-movement.entity';

export class CreateCashMovementDto {
  @ApiProperty({ example: 'Ingreso inicial' })
  @IsString()
  description!: string;

  @Type(() => Number)
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ enum: ['income', 'expense'], default: 'income' })
  @IsOptional()
  @IsIn(['income', 'expense'])
  type?: CashMovementType;

  @ApiPropertyOptional({ enum: ['cash', 'card', 'transfer', 'qr'], default: 'cash' })
  @IsOptional()
  @IsIn(['cash', 'card', 'transfer', 'qr'])
  paymentMethod?: CashMovementPaymentMethod;
}
