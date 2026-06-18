import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@/services/audit-log.module';
import { LicenseController } from './license.controller';
import { LicenseGuard } from './license.guard';
import { LicenseSettingsEntity } from './license-settings.entity';
import { LicenseService } from './license.service';
import { MachineIdentityService } from './machine-identity.service';

@Module({
  imports: [TypeOrmModule.forFeature([LicenseSettingsEntity]), AuditLogModule],
  controllers: [LicenseController],
  providers: [LicenseService, MachineIdentityService, LicenseGuard],
  exports: [LicenseService, MachineIdentityService, LicenseGuard],
})
export class LicenseModule {}
