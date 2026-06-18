import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashModule } from '@/resources/cash/cash.module';
import { ProductsModule } from '@/resources/products/products.module';
import { SaleEntity } from './sale.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaleEntity]), CashModule, ProductsModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
