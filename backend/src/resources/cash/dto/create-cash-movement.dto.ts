import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateCashMovementDto {
  @ApiProperty({ example: 'Ingreso inicial' })
  @IsString()
  description!: string;

  @Type(() => Number)
  @ApiProperty({ example: 1000 })
  @IsNumber()
  amount!: number;
}

