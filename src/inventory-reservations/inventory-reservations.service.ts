import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { DatabaseService } from '../database/database.service';
import {
  CreateInventoryReservationDto,
  UpdateInventoryReservationDto,
} from './dto';

@Injectable()
export class InventoryReservationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createInventoryReservationDto: CreateInventoryReservationDto) {
    // Validate product exists
    const product = await this.databaseService.product.findFirst({
      where: { id: createInventoryReservationDto.productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createInventoryReservationDto.productId} not found`,
      );
    }

    // Validate session exists
    const session = await this.databaseService.bookingSession.findUnique({
      where: { id: createInventoryReservationDto.sessionId },
    });
    if (!session) {
      throw new NotFoundException(
        `Booking session with ID ${createInventoryReservationDto.sessionId} not found`,
      );
    }

    const data: Prisma.InventoryReservationCreateInput = {
      product: { connect: { id: createInventoryReservationDto.productId } },
      session: { connect: { id: createInventoryReservationDto.sessionId } },
      quantity: createInventoryReservationDto.quantity,
      reservedAt: new Date(),
    };

    return this.databaseService.inventoryReservation.create({
      data,
      include: { product: true, session: true },
    });
  }

  async findAll() {
    return this.databaseService.inventoryReservation.findMany({
      include: { product: true, session: true },
      orderBy: { reservedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reservation =
      await this.databaseService.inventoryReservation.findUnique({
        where: { id },
        include: { product: true, session: true },
      });

    if (!reservation) {
      throw new NotFoundException(
        `Inventory reservation with ID ${id} not found`,
      );
    }

    return reservation;
  }

  async update(
    id: string,
    updateInventoryReservationDto: UpdateInventoryReservationDto,
  ) {
    await this.findOne(id);

    const data: Prisma.InventoryReservationUpdateInput = {};
    if (updateInventoryReservationDto.productId)
      data.product = {
        connect: { id: updateInventoryReservationDto.productId },
      };
    if (updateInventoryReservationDto.sessionId)
      data.session = {
        connect: { id: updateInventoryReservationDto.sessionId },
      };
    if (updateInventoryReservationDto.quantity !== undefined)
      data.quantity = updateInventoryReservationDto.quantity;

    return this.databaseService.inventoryReservation.update({
      where: { id },
      data,
      include: { product: true, session: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.databaseService.inventoryReservation.delete({ where: { id } });
  }
}
