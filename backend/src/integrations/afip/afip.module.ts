import { Module } from '@nestjs/common';
import { AfipConfigService } from './afip-config.service';
import { AfipController } from './afip.controller';
import { AfipService } from './afip.service';

@Module({
  controllers: [AfipController],
  providers: [AfipConfigService, AfipService],
  exports: [AfipConfigService, AfipService],
})
export class AfipModule {}
