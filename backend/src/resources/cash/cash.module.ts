import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashController } from './cash.controller';
import { CashMovementEntity } from './cash-movement.entity';
import { CashService } from './cash.service';

@Module({
  imports: [TypeOrmModule.forFeature([CashMovementEntity])],
  controllers: [CashController],
  providers: [CashService],
})
export class CashModule {}

