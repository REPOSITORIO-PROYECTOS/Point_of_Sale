import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Cafe molido' })
  @IsString()
  name!: string;
}
