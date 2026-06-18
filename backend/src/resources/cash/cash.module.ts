import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashSessionEntity } from './cash-session.entity';
import { CashController } from './cash.controller';
import { CashMovementEntity } from './cash-movement.entity';
import { CashService } from './cash.service';

@Module({
  imports: [TypeOrmModule.forFeature([CashMovementEntity, CashSessionEntity])],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
