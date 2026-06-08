import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleEntity } from './sale.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaleEntity])],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}

