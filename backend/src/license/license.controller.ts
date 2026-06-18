import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoute } from '@/decorators/public-routes.decorator';
import { LicenseExempt } from '@/decorators/license-exempt.decorator';
import { ActivateLicenseDto } from './dto/activate-license.dto';
import { LicenseService } from './license.service';

@ApiTags('license')
@Controller('license')
@LicenseExempt()
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('machine-id')
  @PublicRoute()
  async machineId() {
    return { machineId: await this.licenseService.getMachineId() };
  }

  @Get('status')
  @PublicRoute()
  status() {
    return this.licenseService.getStatus();
  }

  @Post('activate')
  @PublicRoute()
  activate(@Body() payload: ActivateLicenseDto) {
    return this.licenseService.activate(payload.licenseKey);
  }
}
