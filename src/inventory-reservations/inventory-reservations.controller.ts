import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryReservationsService } from './inventory-reservations.service';
import { CreateInventoryReservationDto } from './dto/create-inventory-reservation.dto';
import { UpdateInventoryReservationDto } from './dto/update-inventory-reservation.dto';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ApiErrorResponse,
} from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';

@ApiTags('Inventory Reservations')
@Controller('inventory-reservations')
export class InventoryReservationsController {
  constructor(
    private readonly inventoryReservationsService: InventoryReservationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inventory reservation' })
  @ApiCreatedSuccessResponse({
    description: 'Inventory reservation created successfully',
  })
  @ApiErrorResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createInventoryReservationDto: CreateInventoryReservationDto,
  ) {
    const reservation = await this.inventoryReservationsService.create(
      createInventoryReservationDto,
    );
    return ResponseBuilder.created(
      reservation,
      'Inventory reservation created successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory reservations' })
  @ApiStandardResponse(Object, {
    description: 'Inventory reservations retrieved successfully',
  })
  async findAll() {
    const reservations = await this.inventoryReservationsService.findAll();
    return ResponseBuilder.success(
      reservations,
      'Inventory reservations retrieved successfully',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inventory reservation by ID' })
  @ApiStandardResponse(Object, {
    description: 'Inventory reservation retrieved successfully',
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Inventory reservation not found',
  })
  async findOne(@Param('id') id: string) {
    const reservation = await this.inventoryReservationsService.findOne(id);
    return ResponseBuilder.success(
      reservation,
      'Inventory reservation retrieved successfully',
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inventory reservation' })
  @ApiUpdatedSuccessResponse({
    description: 'Inventory reservation updated successfully',
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Inventory reservation not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateInventoryReservationDto: UpdateInventoryReservationDto,
  ) {
    const reservation = await this.inventoryReservationsService.update(
      id,
      updateInventoryReservationDto,
    );
    return ResponseBuilder.updated(
      reservation,
      'Inventory reservation updated successfully',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inventory reservation' })
  @ApiDeletedSuccessResponse({
    description: 'Inventory reservation deleted successfully',
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Inventory reservation not found',
  })
  async remove(@Param('id') id: string) {
    await this.inventoryReservationsService.remove(id);
    return ResponseBuilder.deleted(
      'Inventory reservation deleted successfully',
    );
  }
}
