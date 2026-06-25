import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '@/auth/auth.types';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { InventoryService } from './inventory.service';
import type { StockMovementType } from './stock-movement.entity';

type AuthenticatedRequest = Request & { user?: AuthUser };

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() payload: CreateInventoryItemDto) {
    return this.service.create(payload);
  }

  @Get('stock-movements')
  findStockMovements(
    @Query('type') type?: StockMovementType,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.service.findStockMovements({
      type,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Post('stock-movements')
  createStockMovement(
    @Body() payload: CreateStockMovementDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.createStockMovement(payload, request.user?.id);
  }
}
