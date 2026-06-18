import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { StartCashSessionDto } from './dto/start-cash-session.dto';
import { CashService } from './cash.service';

@ApiTags('cash')
@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get()
  findAll() {
    return this.service.findAllMovements();
  }

  @Post()
  create(@Body() payload: CreateCashMovementDto) {
    return this.service.createMovement(payload);
  }

  @Get('session')
  getSession() {
    return this.service.getSession();
  }

  @Post('session/start')
  startSession(@Body() payload: StartCashSessionDto) {
    return this.service.startSession(payload);
  }

  @Post('session/close')
  closeSession(@Body() payload: CloseCashSessionDto) {
    return this.service.closeSession(payload);
  }
}
