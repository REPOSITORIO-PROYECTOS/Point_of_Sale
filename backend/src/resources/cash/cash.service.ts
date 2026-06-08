import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashMovementEntity } from './cash-movement.entity';

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(CashMovementEntity)
    private readonly repository: Repository<CashMovementEntity>,
  ) {}

  findAll() {
    return this.repository.find({ order: { id: 'DESC' } });
  }

  create(payload: CreateCashMovementDto) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }
}

