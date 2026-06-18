import {
  Controller,
  Get,
  Headers,
  Post,
  Body,
  Query,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicRoute } from '@/decorators/public-routes.decorator';
import { LicenseExempt } from '@/decorators/license-exempt.decorator';
import { ResetAdminDto } from './dto/reset-admin.dto';
import { GenerateLicenseDto } from '@/license/dto/generate-license.dto';
import { buildLicensePayload } from '@/license/license.service';
import { loadPrivateKey, signLicensePayload } from '@/license/license-crypto';
import { env } from '@/config/env.config';
import {
  readRecoveryKey,
  readRecoveryToken,
  SupportRecoveryService,
} from './support-recovery.service';

@ApiTags('support')
@Controller('support/recovery')
@LicenseExempt()
export class SupportRecoveryController {
  constructor(private readonly recoveryService: SupportRecoveryService) {}

  @Post('unlock')
  @PublicRoute()
  unlock(@Headers() headers: Record<string, string | string[] | undefined>) {
    if (!this.recoveryService.isRecoveryEnabled()) {
      throw new ServiceUnavailableException('Modo de recuperación deshabilitado');
    }

    const recoveryKey = readRecoveryKey(headers);
    if (!this.recoveryService.verifyRecoveryKey(recoveryKey)) {
      throw new UnauthorizedException('Clave de recuperación inválida');
    }

    return this.recoveryService.unlock(recoveryKey!);
  }

  @Get('diagnostics')
  @PublicRoute()
  async diagnostics(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.recoveryService.assertValidRecoveryToken(readRecoveryToken(headers));
    return this.recoveryService.getDiagnostics();
  }

  @Get('export')
  @PublicRoute()
  async export(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('format') format: string | undefined,
    @Res() response: Response,
  ) {
    this.recoveryService.assertValidRecoveryToken(readRecoveryToken(headers));

    if (format === 'sqlite') {
      await this.recoveryService.streamSqliteBackup(response);
      return;
    }

    const payload = await this.recoveryService.exportJson();
    response.json(payload);
  }

  @Post('reset-admin')
  @PublicRoute()
  resetAdmin(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: ResetAdminDto,
  ) {
    this.recoveryService.assertValidRecoveryToken(readRecoveryToken(headers));
    return this.recoveryService.resetAdmin(payload.username, payload.password);
  }

  @Post('generate-license')
  @PublicRoute()
  generateLicense(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: GenerateLicenseDto,
  ) {
    const recoveryKey = readRecoveryKey(headers);
    if (!this.recoveryService.verifyRecoveryKey(recoveryKey)) {
      throw new UnauthorizedException('Clave de recuperación inválida');
    }

    const privateKey = loadPrivateKey(env.licensePrivateKeyPath);
    const licensePayload = buildLicensePayload({
      licenseId: payload.licenseId,
      clientNumber: payload.client,
      machineId: payload.machineId,
      expiresAt: payload.expires ? new Date(payload.expires).toISOString() : null,
      features: payload.features,
    });

    const signed = signLicensePayload(licensePayload, privateKey);
    return { licenseKey: signed.licenseKey };
  }
}
