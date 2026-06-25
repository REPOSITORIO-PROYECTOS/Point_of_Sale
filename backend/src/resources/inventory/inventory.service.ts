import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { InventoryItemEntity } from './inventory-item.entity';
import { StockMovementEntity, type StockMovementType } from './stock-movement.entity';

export type StockMovementResponse = {
  id: number;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  stockBefore?: number;
  stockAfter?: number;
  destinationLocal?: string;
  notes?: string;
  userId?: string;
  createdAt: string;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItemEntity)
    private readonly repository: Repository<InventoryItemEntity>,
    @InjectRepository(StockMovementEntity)
    private readonly stockMovementRepository: Repository<StockMovementEntity>,
    private readonly productsService: ProductsService,
  ) {}

  findAll() {
    return this.repository.find({ order: { id: 'DESC' } });
  }

  create(payload: CreateInventoryItemDto) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  findStockMovements(params: { type?: StockMovementType; limit?: number } = {}) {
    const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const qb = this.stockMovementRepository
      .createQueryBuilder('movement')
      .orderBy('movement.createdAt', 'DESC')
      .take(limit);

    if (params.type) {
      qb.andWhere('movement.type = :type', { type: params.type });
    }

    return qb.getMany().then((items) => items.map(toStockMovementResponse));
  }

  async createStockMovement(payload: CreateStockMovementDto, userId?: string) {
    if (payload.type === 'transfer' && !payload.destinationLocal?.trim()) {
      throw new BadRequestException('destinationLocal is required for transfer movements');
    }

    const deltaByType: Record<StockMovementType, number> = {
      in: 1,
      out: -1,
      transfer: -1,
    };
    const deltaSign = deltaByType[payload.type];
    const saved: StockMovementEntity[] = [];

    for (const item of payload.items) {
      const product = await this.productsService.findOne(item.productId);
      const { stockBefore, stockAfter } = await this.productsService.adjustStock(
        item.productId,
        deltaSign * item.quantity,
      );

      const entity = this.stockMovementRepository.create({
        productId: product.id,
        productName: product.name,
        type: payload.type,
        quantity: item.quantity,
        stockBefore,
        stockAfter,
        destinationLocal:
          payload.type === 'transfer' ? payload.destinationLocal?.trim() ?? null : null,
        notes: payload.notes?.trim() || null,
        userId: userId ?? null,
      });

      saved.push(await this.stockMovementRepository.save(entity));
    }

    return saved.map(toStockMovementResponse);
  }
}

function toStockMovementResponse(entity: StockMovementEntity): StockMovementResponse {
  return {
    id: entity.id,
    productId: entity.productId,
    productName: entity.productName,
    type: entity.type,
    quantity: entity.quantity,
    ...(entity.stockBefore != null ? { stockBefore: entity.stockBefore } : {}),
    ...(entity.stockAfter != null ? { stockAfter: entity.stockAfter } : {}),
    ...(entity.destinationLocal ? { destinationLocal: entity.destinationLocal } : {}),
    ...(entity.notes ? { notes: entity.notes } : {}),
    ...(entity.userId ? { userId: entity.userId } : {}),
    createdAt: entity.createdAt.toISOString(),
  };
}
