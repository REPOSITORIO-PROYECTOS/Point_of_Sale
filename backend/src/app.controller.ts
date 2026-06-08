import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoute } from './decorators/public-routes.decorator';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @PublicRoute()
  getStatus() {
    return this.appService.getStatus();
  }
}

