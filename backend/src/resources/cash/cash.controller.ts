import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/auth.types';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { StartCashSessionDto } from './dto/start-cash-session.dto';
import { CashService } from './cash.service';

type AuthenticatedRequest = Request & { user?: AuthUser };

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

  @Get('sessions/history')
  listClosedSessions() {
    return this.service.listClosedSessions();
  }

  @Post('session/start')
  startSession(@Body() payload: StartCashSessionDto) {
    return this.service.startSession(payload);
  }

  @Post('session/close')
  closeSession(@Body() payload: CloseCashSessionDto, @Req() request: AuthenticatedRequest) {
    const user = request.user;
    const closedBy = user
      ? { username: user.username, role: user.role }
      : undefined;

    return this.service.closeSession(payload, closedBy);
  }
}
