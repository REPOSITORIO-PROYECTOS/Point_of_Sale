import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { InventoryService } from './inventory.service';

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
}

