import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/auth/user.entity';
import { SaleEntity } from '@/resources/sales/sale.entity';
import { CashSessionEntity } from './cash-session.entity';
import { CashController } from './cash.controller';
import { CashMovementEntity } from './cash-movement.entity';
import { CashService } from './cash.service';

@Module({
  imports: [TypeOrmModule.forFeature([CashMovementEntity, CashSessionEntity, SaleEntity, UserEntity])],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
