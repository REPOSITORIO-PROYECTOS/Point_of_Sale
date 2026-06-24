import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'juan.perez' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El usuario debe tener al menos 3 caracteres' })
  username?: string;

  @ApiPropertyOptional({ example: 'ClaveActual123' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({ example: 'NuevaClave123!' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @ApiPropertyOptional({ example: 'NuevaClave123!' })
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}
