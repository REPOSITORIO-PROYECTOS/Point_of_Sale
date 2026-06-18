import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class StartCashSessionDto {
  @Type(() => Number)
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  initialBalance!: number;
}
