import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { InventoryItemEntity } from './inventory-item.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItemEntity)
    private readonly repository: Repository<InventoryItemEntity>,
  ) {}

  findAll() {
    return this.repository.find({ order: { id: 'DESC' } });
  }

  create(payload: CreateInventoryItemDto) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }
}

