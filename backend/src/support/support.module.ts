import { Module } from '@nestjs/common';
import { LicenseModule } from '@/license/license.module';
import { AuditLogModule } from '@/services/audit-log.module';
import { SupportRecoveryController } from './support-recovery.controller';
import { SupportRecoveryService } from './support-recovery.service';

@Module({
  imports: [AuditLogModule, LicenseModule],
  controllers: [SupportRecoveryController],
  providers: [SupportRecoveryService],
  exports: [SupportRecoveryService],
})
export class SupportModule {}
