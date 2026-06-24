import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '@/auth/auth.types';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { FindCashClosingsDto } from './dto/find-cash-closings.dto';
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

  @Get('closings')
  findClosings(@Query() query: FindCashClosingsDto) {
    return this.service.findClosings(query);
  }

  @Get('closings/:id')
  getClosingDetail(@Param('id') id: string) {
    return this.service.getClosingDetail(id);
  }

  @Post('session/start')
  startSession(@Body() payload: StartCashSessionDto, @Req() request: AuthenticatedRequest) {
    return this.service.startSession(payload, request.user?.id);
  }

  @Post('session/close')
  closeSession(@Body() payload: CloseCashSessionDto, @Req() request: AuthenticatedRequest) {
    return this.service.closeSession(payload, request.user?.id);
  }
}
