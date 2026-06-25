import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class BulkUpsertProductsDto {
  @ApiProperty({ type: [CreateProductDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products!: CreateProductDto[];

  /** Si true, responde solo `{ count }` (ideal para importaciones grandes). */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  summaryOnly?: boolean;
}
