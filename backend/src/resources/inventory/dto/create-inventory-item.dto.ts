import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Harina 000' })
  @IsString()
  name!: string;
}
