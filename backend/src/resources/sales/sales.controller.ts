import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() payload: CreateSaleDto) {
    return this.service.create(payload);
  }
}

