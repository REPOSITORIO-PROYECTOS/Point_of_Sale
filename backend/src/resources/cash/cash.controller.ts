import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashService } from './cash.service';

@ApiTags('cash')
@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() payload: CreateCashMovementDto) {
    return this.service.create(payload);
  }
}

