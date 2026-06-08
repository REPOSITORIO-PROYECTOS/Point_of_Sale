import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleEntity } from './sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SaleEntity)
    private readonly repository: Repository<SaleEntity>,
  ) {}

  findAll() {
    return this.repository.find({ order: { id: 'DESC' } });
  }

  create(payload: CreateSaleDto) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }
}

