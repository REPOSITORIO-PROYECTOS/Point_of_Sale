import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/auth/user.entity';
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

  async update(id: string, payload: UpdateUserDto) {
    const user = await this.repository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    user.isActive = payload.isActive;
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
