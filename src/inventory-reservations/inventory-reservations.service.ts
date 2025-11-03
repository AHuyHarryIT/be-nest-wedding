import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInventoryReservationDto } from './dto/create-inventory-reservation.dto';
import { UpdateInventoryReservationDto } from './dto/update-inventory-reservation.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryReservationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  create(createInventoryReservationDto: CreateInventoryReservationDto) {
    const data: any = { ...createInventoryReservationDto };
    if (createInventoryReservationDto.reservedAt) {
      data.reservedAt = new Date(createInventoryReservationDto.reservedAt);
    }
    return this.databaseService.inventoryReservation.create({
      data,
      include: {
        product: true,
        session: true,
      },
    });
  }

  findAll() {
    return this.databaseService.inventoryReservation.findMany({
      include: {
        product: true,
        session: true,
      },
      orderBy: { reservedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reservation =
      await this.databaseService.inventoryReservation.findUnique({
        where: { id },
        include: {
          product: true,
          session: {
            include: {
              booking: true,
            },
          },
        },
      });

    if (!reservation) {
      throw new NotFoundException('Inventory reservation not found');
    }

    return reservation;
  }

  update(
    id: string,
    updateInventoryReservationDto: UpdateInventoryReservationDto,
  ) {
    const data: any = { ...updateInventoryReservationDto };
    if (updateInventoryReservationDto.reservedAt) {
      data.reservedAt = new Date(updateInventoryReservationDto.reservedAt);
    }
    return this.databaseService.inventoryReservation.update({
      where: { id },
      data,
      include: {
        product: true,
        session: true,
      },
    });
  }

  remove(id: string) {
    return this.databaseService.inventoryReservation.delete({ where: { id } });
  }
}
