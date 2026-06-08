import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoute } from '@/decorators/public-routes.decorator';
import { env } from '@/config/env.config';
import { AfipConfigService } from './afip-config.service';
import { ImportAfipCredentialsDto } from './dto/import-afip-credentials.dto';
import { AfipService } from './afip.service';

@ApiTags('integrations-afip')
@Controller('integrations/afip')
export class AfipController {
  constructor(
    private readonly afipService: AfipService,
    private readonly afipConfigService: AfipConfigService,
  ) {}

  @Get('health')
  @PublicRoute()
  async health() {
    const result = await this.afipService.healthCheck();
    const config = this.afipConfigService.getStatus();

    return {
      ...result,
      configured: this.afipService.isConfigured(),
      credentialsConfigured: config.configured,
      microservice: true,
      puntoVenta: config.puntoVenta ?? env.afipPuntoVenta,
      production: config.production ?? env.afipProduction,
    };
  }

  @Get('config')
  @PublicRoute()
  getConfig() {
    return this.afipConfigService.getStatus();
  }

  @Post('credentials')
  @PublicRoute()
  importCredentials(@Body() payload: ImportAfipCredentialsDto) {
    const status = this.afipConfigService.importCredentials(payload);

    return {
      message: 'AFIP credentials imported successfully',
      status,
    };
  }
}
