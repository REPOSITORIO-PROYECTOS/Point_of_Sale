import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItemEntity } from './inventory-item.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItemEntity])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}

