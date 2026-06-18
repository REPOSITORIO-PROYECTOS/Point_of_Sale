import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { AuthUser, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { username: payload.username },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const authUser = toAuthUser(user);
    const accessToken = await this.jwtService.signAsync(toJwtPayload(authUser));

    return { accessToken, user: authUser };
  }

  profile(user: AuthUser) {
    return user;
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
