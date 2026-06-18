import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashService } from '@/resources/cash/cash.service';
import { ProductsService } from '@/resources/products/products.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleEntity } from './sale.entity';

export type SaleResponse = {
  id: string;
  items: CreateSaleDto['items'];
  total: number;
  timestamp: string;
  payments?: CreateSaleDto['payments'];
  voucherType?: string;
  cashSessionId?: string;
  userId?: string;
};

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SaleEntity)
    private readonly repository: Repository<SaleEntity>,
    private readonly cashService: CashService,
    private readonly productsService: ProductsService,
  ) {}

  findAll() {
    return this.repository.find({ order: { timestamp: 'DESC' } }).then((items) => items.map(toSaleResponse));
  }

  async create(payload: CreateSaleDto, userId?: string) {
    const openSession = await this.cashService.getOpenSession();

    if (!openSession) {
      throw new BadRequestException('No open cash session. Start a cash session before recording sales.');
    }

    const entity = this.repository.create({
      id: payload.id,
      items: JSON.stringify(payload.items),
      total: payload.total,
      payments: payload.payments ? JSON.stringify(payload.payments) : null,
      voucherType: payload.voucherType ?? null,
      cashSessionId: openSession.id,
      userId: userId ?? null,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    });

    const saved = await this.repository.save(entity);

    for (const item of payload.items) {
      await this.productsService.decrementStock(item.id, item.quantity);
    }

    await this.cashService.recordSale(
      openSession.id,
      payload.total,
      payload.payments?.map((payment) => ({
        type: payment.type,
        amount: payment.amount,
      })),
    );

    return toSaleResponse(saved);
  }
}

function toSaleResponse(entity: SaleEntity): SaleResponse {
  return {
    id: entity.id,
    items: JSON.parse(entity.items) as CreateSaleDto['items'],
    total: entity.total,
    timestamp: entity.timestamp.toISOString(),
    ...(entity.payments ? { payments: JSON.parse(entity.payments) as CreateSaleDto['payments'] } : {}),
    ...(entity.voucherType ? { voucherType: entity.voucherType } : {}),
    ...(entity.cashSessionId ? { cashSessionId: entity.cashSessionId } : {}),
    ...(entity.userId ? { userId: entity.userId } : {}),
  };
}
