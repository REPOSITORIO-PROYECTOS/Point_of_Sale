import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoute } from './decorators/public-routes.decorator';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get()
  @PublicRoute()
  getStatus() {
    return this.appService.getStatus();
  }

  @Get('version')
  @PublicRoute()
  getVersion() {
    return this.appService.getVersion();
  }
}

