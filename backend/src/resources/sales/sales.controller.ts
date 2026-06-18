import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '@/auth/auth.types';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

type AuthenticatedRequest = Request & { user?: AuthUser };

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() payload: CreateSaleDto, @Req() request: AuthenticatedRequest) {
    return this.service.create(payload, request.user?.id);
  }
}

