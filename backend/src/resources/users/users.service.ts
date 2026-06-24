import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '@/auth/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type UserResponse = {
  id: string;
  username: string;
  role: UserEntity['role'];
  isActive: boolean;
  createdAt: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findAll() {
    return this.repository
      .find({ order: { username: 'ASC' } })
      .then((users) => users.map(toUserResponse));
  }

  async create(payload: CreateUserDto) {
    const username = payload.username.trim();
    const existing = await this.repository.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException(`El usuario "${username}" ya existe`);
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const saved = await this.repository.save({
      id: randomUUID(),
      username,
      passwordHash,
      role: payload.role,
      isActive: true,
    });

    return toUserResponse(saved);
  }

  async update(id: string, payload: UpdateUserDto, actorId?: string) {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (payload.isActive === false && actorId === id) {
      throw new BadRequestException('No podés desactivar tu propia cuenta');
    }

    if (payload.role !== undefined) {
      user.role = payload.role;
    }

    if (payload.isActive !== undefined) {
      user.isActive = payload.isActive;
    }

    if (payload.password) {
      user.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    const saved = await this.repository.save(user);
    return toUserResponse(saved);
  }
}

function toUserResponse(user: UserEntity): UserResponse {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}
