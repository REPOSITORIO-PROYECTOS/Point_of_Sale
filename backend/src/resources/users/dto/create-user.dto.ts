import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { USER_ROLES } from '@/auth/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'maria.gonzalez' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'Segura123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: USER_ROLES, example: 'cashier' })
  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];
}
