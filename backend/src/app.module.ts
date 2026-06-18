import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { env } from './config/env.config';
import { SqliteBootstrapService } from './database/sqlite-bootstrap.service';
import { AuditExceptionFilter } from './filters/audit-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { ControllerLoggingInterceptor } from './interceptors/controller-logging.interceptor';
import { AfipModule } from './integrations/afip/afip.module';
import { RemoteAgentModule } from './integrations/remote/remote.module';
import { CashModule } from './resources/cash/cash.module';
import { InventoryModule } from './resources/inventory/inventory.module';
import { ParcelsModule } from './resources/parcels/parcels.module';
import { ProductsModule } from './resources/products/products.module';
import { SalesModule } from './resources/sales/sales.module';
import { SettingsModule } from './resources/settings/settings.module';
import { UsersModule } from './resources/users/users.module';
import { LicenseModule } from './license/license.module';
import { LicenseGuard } from './license/license.guard';
import { SupportModule } from './support/support.module';
import { AuditLogModule } from './services/audit-log.module';
import { EnhancedLoggerModule } from './services/enhanced-logger.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: env.sqliteDbPath,
      autoLoadEntities: true,
      synchronize: true,
      logging: env.nodeEnv !== 'production',
    }),
    LicenseModule,
    AuthModule,
    AuditLogModule,
    EnhancedLoggerModule,
    AfipModule,
    RemoteAgentModule,
    ProductsModule,
    SalesModule,
    InventoryModule,
    CashModule,
    ParcelsModule,
    SettingsModule,
    UsersModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SqliteBootstrapService,
    { provide: APP_GUARD, useClass: LicenseGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ControllerLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: AuditExceptionFilter },
  ],
})
export class AppModule {}
