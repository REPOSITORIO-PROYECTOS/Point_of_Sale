import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductEntity } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  findAll() {
    return this.repository.find({ order: { id: 'DESC' } });
  }

  create(payload: CreateProductDto) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }
}

