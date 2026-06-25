import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { InventoryItemEntity } from './inventory-item.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockMovementEntity } from './stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItemEntity, StockMovementEntity]),
    ProductsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
