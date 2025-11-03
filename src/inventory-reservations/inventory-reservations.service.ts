import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateInventoryReservationDto } from './dto/create-inventory-reservation.dto';
import { UpdateInventoryReservationDto } from './dto/update-inventory-reservation.dto';

@Injectable()
export class InventoryReservationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createDto: CreateInventoryReservationDto) {
    return await this.databaseService.inventoryReservation.create({
      data: {
        productId: createDto.productId,
        sessionId: createDto.sessionId,
        quantity: createDto.quantity,
      },
    });
  }

  async findAll() {
    return await this.databaseService.inventoryReservation.findMany({
      include: {
        product: true,
        session: true,
      },
    });
  }

  async findOne(id: string) {
    const reservation =
      await this.databaseService.inventoryReservation.findUnique({
        where: { id },
        include: {
          product: true,
          session: true,
        },
      });

    if (!reservation) {
      throw new NotFoundException(
        `Inventory reservation with ID "${id}" not found`,
      );
    }

    return reservation;
  }

  async update(id: string, updateDto: UpdateInventoryReservationDto) {
    await this.findOne(id);

    return await this.databaseService.inventoryReservation.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.databaseService.inventoryReservation.delete({
      where: { id },
    });
  }
}
