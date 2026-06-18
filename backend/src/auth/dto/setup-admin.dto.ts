import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetupAdminDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'mi-contraseña-segura' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'mi-contraseña-segura' })
  @IsString()
  @MinLength(6)
  confirmPassword!: string;
}
