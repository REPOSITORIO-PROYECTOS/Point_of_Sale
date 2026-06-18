import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@/decorators/roles.decorator';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { ParcelsService } from './parcels.service';

@ApiTags('parcels')
@Controller('parcels')
@Roles('admin')
export class ParcelsController {
  constructor(private readonly service: ParcelsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() payload: CreateParcelDto) {
    return this.service.create(payload);
  }
}
