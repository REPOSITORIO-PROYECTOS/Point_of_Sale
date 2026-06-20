import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { USER_ROLES, type UserRole } from '@/auth/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'cajero2' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'mi-contraseña-segura' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: USER_ROLES, example: 'cashier' })
  @IsIn(USER_ROLES)
  role!: UserRole;
}
