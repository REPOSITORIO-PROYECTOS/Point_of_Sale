import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['id'] as const)) {}
