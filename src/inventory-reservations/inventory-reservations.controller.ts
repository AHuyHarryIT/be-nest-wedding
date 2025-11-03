import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InventoryReservationsService } from './inventory-reservations.service';
import { CreateInventoryReservationDto } from './dto/create-inventory-reservation.dto';
import { UpdateInventoryReservationDto } from './dto/update-inventory-reservation.dto';

@Controller('inventory-reservations')
export class InventoryReservationsController {
  constructor(
    private readonly inventoryReservationsService: InventoryReservationsService,
  ) {}

  @Post()
  create(@Body() createInventoryReservationDto: CreateInventoryReservationDto) {
    return this.inventoryReservationsService.create(
      createInventoryReservationDto,
    );
  }

  @Get()
  findAll() {
    return this.inventoryReservationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryReservationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInventoryReservationDto: UpdateInventoryReservationDto,
  ) {
    return this.inventoryReservationsService.update(
      id,
      updateInventoryReservationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryReservationsService.remove(id);
  }
}
