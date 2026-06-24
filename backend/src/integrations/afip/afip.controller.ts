import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoute } from '@/decorators/public-routes.decorator';
import { env } from '@/config/env.config';
import { AfipConfigService } from './afip-config.service';
import { ImportAfipCertificateDto } from './dto/import-afip-certificate.dto';
import { ImportAfipCredentialsDto } from './dto/import-afip-credentials.dto';
import { IssueAfipInvoiceDto } from './dto/issue-afip-invoice.dto';
import { GenerateAfipCsrDto } from './dto/generate-afip-csr.dto';
import { SaveAfipPrivateKeyDto } from './dto/save-afip-private-key.dto';
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

  @Post('generate-csr')
  @PublicRoute()
  generateCsr(@Body() payload: GenerateAfipCsrDto) {
    const result = this.afipConfigService.generateCsrAndSaveKey(payload);

    return {
      message: 'AFIP private key saved. Upload the CSR to AFIP and import the approved certificate when ready.',
      csr: result.csr,
      status: result.status,
    };
  }

  @Post('private-key')
  @PublicRoute()
  savePrivateKey(@Body() payload: SaveAfipPrivateKeyDto) {
    const status = this.afipConfigService.savePrivateKey(payload);

    return {
      message: 'AFIP private key saved. Import the certificate when AFIP approves it.',
      status,
    };
  }

  @Post('certificate')
  @PublicRoute()
  importCertificate(@Body() payload: ImportAfipCertificateDto) {
    const status = this.afipConfigService.importCertificate(payload);

    return {
      message: 'AFIP certificate imported successfully',
      status,
    };
  }

  @Post('facturar')
  @PublicRoute()
  async facturar(@Body() payload: IssueAfipInvoiceDto) {
    if (!this.afipConfigService.isConfigured()) {
      throw new BadRequestException('AFIP credentials are not fully configured');
    }

    const result = await this.afipService.issueInvoice(payload);

    return {
      message: 'Invoice issued via AFIP microservice',
      result,
    };
  }
}
