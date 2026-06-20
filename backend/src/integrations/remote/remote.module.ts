import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseModule } from '@/license/license.module';
import { CashModule } from '@/resources/cash/cash.module';
import { ProductsModule } from '@/resources/products/products.module';
import { ProductEntity } from '@/resources/products/product.entity';
import { SaleEntity } from '@/resources/sales/sale.entity';
import { RemoteAgentController } from './remote.controller';
import { RemoteCommandService } from './remote-command.service';
import { RemoteSnapshotService } from './remote-snapshot.service';
import { RemoteAgentService } from './remote.service';

@Module({
  imports: [
    CashModule,
    LicenseModule,
    ProductsModule,
    TypeOrmModule.forFeature([SaleEntity, ProductEntity]),
  ],
  controllers: [RemoteAgentController],
  providers: [RemoteAgentService, RemoteSnapshotService, RemoteCommandService],
  exports: [RemoteAgentService],
})
export class RemoteAgentModule {}
