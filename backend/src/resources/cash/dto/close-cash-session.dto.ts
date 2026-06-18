import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CloseCashSessionDto {
  @Type(() => Number)
  @ApiProperty({ description: 'Monto contado físicamente en caja' })
  @IsNumber()
  @Min(0)
  countedAmount!: number;

  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Saldo esperado (inicial + ventas)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedBalance?: number;
}
