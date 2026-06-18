import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseModule } from '@/license/license.module';
import { CashModule } from '@/resources/cash/cash.module';
import { ProductEntity } from '@/resources/products/product.entity';
import { SaleEntity } from '@/resources/sales/sale.entity';
import { RemoteAgentController } from './remote.controller';
import { RemoteSnapshotService } from './remote-snapshot.service';
import { RemoteAgentService } from './remote.service';

@Module({
  imports: [
    CashModule,
    LicenseModule,
    TypeOrmModule.forFeature([SaleEntity, ProductEntity]),
  ],
  controllers: [RemoteAgentController],
  providers: [RemoteAgentService, RemoteSnapshotService],
  exports: [RemoteAgentService],
})
export class RemoteAgentModule {}
