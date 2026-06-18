import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { ParcelEntity } from './parcel.entity';

export type ParcelResponse = {
  id: string;
  customerName: string;
  description: string;
  amount: number;
  status: ParcelEntity['status'];
  date: string;
};

@Injectable()
export class ParcelsService {
  constructor(
    @InjectRepository(ParcelEntity)
    private readonly repository: Repository<ParcelEntity>,
  ) {}

  findAll() {
    return this.repository.find({ order: { date: 'DESC', createdAt: 'DESC' } }).then((items) =>
      items.map(toParcelResponse),
    );
  }

  async create(payload: CreateParcelDto) {
    const existing = await this.repository.findOne({ where: { id: payload.id } });

    if (existing) {
      throw new ConflictException(`Parcel ${payload.id} already exists`);
    }

    const entity = this.repository.create({
      id: payload.id,
      customerName: payload.customerName,
      description: payload.description,
      amount: payload.amount,
      status: payload.status ?? 'pending',
      date: payload.date ?? new Date().toISOString().slice(0, 10),
    });

    const saved = await this.repository.save(entity);
    return toParcelResponse(saved);
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException(`Parcel ${id} not found`);
    }

    return toParcelResponse(entity);
  }
}

function toParcelResponse(entity: ParcelEntity): ParcelResponse {
  return {
    id: entity.id,
    customerName: entity.customerName,
    description: entity.description,
    amount: entity.amount,
    status: entity.status,
    date: entity.date,
  };
}
