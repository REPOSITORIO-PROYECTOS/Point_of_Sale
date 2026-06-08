import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateSaleDto {
  @ApiProperty({ example: 'product-1' })
  @IsString()
  productId!: string;

  @Type(() => Number)
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

