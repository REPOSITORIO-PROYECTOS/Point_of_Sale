import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { LicenseService } from '@/license/license.service';
import type { AuthUser, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SetupAdminDto } from './dto/setup-admin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly licenseService: LicenseService,
  ) {}

  async getSetupStatus() {
    const userCount = await this.usersRepository.count();
    return { needsSetup: userCount === 0 };
  }

  // One-shot first-run admin creation. Rate limiting recommended for production hardening.
  async setupAdmin(payload: SetupAdminDto) {
    if (payload.password !== payload.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    return this.usersRepository.manager.transaction(async (manager) => {
      const userCount = await manager.count(UserEntity);
      if (userCount > 0) {
        throw new ConflictException('La configuración inicial ya fue completada');
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);
      const user = await manager.save(UserEntity, {
        id: randomUUID(),
        username: payload.username.trim(),
        passwordHash,
        role: 'admin',
        isActive: true,
      });

      const authUser = toAuthUser(user);
      const accessToken = await this.jwtService.signAsync(toJwtPayload(authUser));
      return { accessToken, user: authUser };
    });
  }

  async login(payload: LoginDto, clientIp = 'unknown') {
    const user = await this.usersRepository.findOne({
      where: { username: payload.username },
    });

    if (!user || !user.isActive) {
      await this.licenseService.recordFailedLogin(clientIp);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      await this.licenseService.recordFailedLogin(clientIp);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.licenseService.clearLoginAttempts(clientIp);

    const authUser = toAuthUser(user);
    const accessToken = await this.jwtService.signAsync(toJwtPayload(authUser));

    return { accessToken, user: authUser };
  }

  profile(user: AuthUser) {
    return user;
  }

  async updateProfile(authUser: AuthUser, payload: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: authUser.id } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    if (payload.password !== undefined) {
      if (!payload.currentPassword) {
        throw new BadRequestException('Debe ingresar la contraseña actual');
      }
      if (payload.password !== payload.confirmPassword) {
        throw new BadRequestException('Las contraseñas no coinciden');
      }

      const passwordMatches = await bcrypt.compare(payload.currentPassword, user.passwordHash);
      if (!passwordMatches) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }

      user.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    if (payload.username !== undefined) {
      const username = payload.username.trim();
      if (username.length < 3) {
        throw new BadRequestException('El usuario debe tener al menos 3 caracteres');
      }
      if (username !== user.username) {
        const existing = await this.usersRepository.findOne({ where: { username } });
        if (existing) {
          throw new ConflictException(`El usuario "${username}" ya existe`);
        }
        user.username = username;
      }
    }

    const saved = await this.usersRepository.save(user);
    const updatedAuthUser = toAuthUser(saved);
    const accessToken = await this.jwtService.signAsync(toJwtPayload(updatedAuthUser));

    return { accessToken, user: updatedAuthUser };
  }

  verifyToken(token: string): AuthUser {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}

function toAuthUser(user: UserEntity): AuthUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

function toJwtPayload(user: AuthUser): JwtPayload {
  return {
    sub: user.id,
    username: user.username,
    role: user.role,
  };
}
