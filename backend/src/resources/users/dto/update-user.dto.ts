import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}
