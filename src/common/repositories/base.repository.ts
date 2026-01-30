import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { PrismaCrudOptions, GenericRecord } from '../types';

/**
 * Prisma delegate interface for type-safe model access
 */
interface PrismaDelegate<T> {
  findUnique(query: GenericRecord<unknown>): Promise<T | null>;
  findMany(query?: GenericRecord<unknown>): Promise<T[]>;
  findFirst(query?: GenericRecord<unknown>): Promise<T | null>;
  create(query: GenericRecord<unknown>): Promise<T>;
  update(query: GenericRecord<unknown>): Promise<T>;
  updateMany(query: GenericRecord<unknown>): Promise<{ count: number }>;
  delete(query: GenericRecord<unknown>): Promise<T>;
  deleteMany(query: GenericRecord<unknown>): Promise<{ count: number }>;
  upsert(query: GenericRecord<unknown>): Promise<T>;
  count(query: GenericRecord<unknown>): Promise<number>;
}

/**
 * Generic base repository providing common CRUD operations
 * Supports transactions and query building patterns
 */
@Injectable()
export class BaseRepository<T extends GenericRecord<unknown>> {
  protected modelName: string = '';

  constructor(protected db: DatabaseService) {}

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<T | null> {
    const model = this.getModel<T>();
    return model.findUnique({
      where: { id },
    });
  }

  /**
   * Find records with optional filtering and pagination
   */
  async findMany(params?: PrismaCrudOptions<T>): Promise<T[]> {
    const model = this.getModel<T>();
    return model.findMany((params as GenericRecord<unknown>) || {});
  }

  /**
   * Count records matching criteria
   */
  async count(where?: GenericRecord<unknown>): Promise<number> {
    const model = this.getModel<T>();
    return model.count({ where });
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const model = this.getModel<T>();
    return model.create({
      data,
    });
  }

  /**
   * Create multiple records
   */
  async createMany(data: Partial<T>[]): Promise<T[]> {
    return Promise.all(data.map((item) => this.create(item)));
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const model = this.getModel<T>();
    return model.update({
      where: { id },
      data,
    });
  }

  /**
   * Update multiple records matching criteria
   */
  async updateMany(params: {
    where: GenericRecord<unknown>;
    data: Partial<T>;
  }): Promise<number> {
    const model = this.getModel<T>();
    const result = await model.updateMany(params);
    return result.count;
  }

  /**
   * Delete a record by ID (soft delete if deletedAt field exists)
   */
  async delete(id: string, softDelete = true): Promise<T> {
    const model = this.getModel<T>();
    if (softDelete) {
      return model.update({
        where: { id },
        data: { deletedAt: new Date() } as unknown as Partial<T>,
      });
    }
    return model.delete({
      where: { id },
    });
  }

  /**
   * Permanently delete a record
   */
  async hardDelete(id: string): Promise<T> {
    const model = this.getModel<T>();
    return model.delete({
      where: { id },
    });
  }

  /**
   * Delete multiple records matching criteria
   */
  async deleteMany(
    where: GenericRecord<unknown>,
    softDelete = true,
  ): Promise<number> {
    const model = this.getModel<T>();
    if (softDelete) {
      const result = await model.updateMany({
        where,
        data: { deletedAt: new Date() } as unknown as Partial<T>,
      });
      return result.count;
    }
    const result = await model.deleteMany({ where });
    return result.count;
  }

  /**
   * Find or create a record
   */
  async findOrCreate(params: {
    where: GenericRecord<unknown>;
    create: Partial<T>;
  }): Promise<T> {
    const model = this.getModel<T>();
    return model.upsert({
      where: params.where,
      update: {},
      create: params.create,
    });
  }

  /**
   * Upsert a record
   */
  async upsert(params: {
    where: GenericRecord<unknown>;
    create: Partial<T>;
    update: Partial<T>;
  }): Promise<T> {
    const model = this.getModel<T>();
    return model.upsert(params);
  }

  /**
   * Find first record matching criteria
   */
  async findOne(params?: PrismaCrudOptions<T>): Promise<T | null> {
    const model = this.getModel<T>();
    return model.findFirst((params as GenericRecord<unknown>) || {});
  }

  /**
   * Check if record exists
   */
  async exists(where: GenericRecord<unknown>): Promise<boolean> {
    const model = this.getModel<T>();
    const count = await model.count({ where });
    return count > 0;
  }

  /**
   * Get the Prisma model for this repository
   */
  protected getModel<
    U extends GenericRecord<unknown> = T,
  >(): PrismaDelegate<U> {
    const model = (this.db as unknown as GenericRecord<PrismaDelegate<U>>)[
      this.modelName
    ];
    if (!model) {
      throw new Error(`Model ${this.modelName} not found in database service`);
    }
    return model;
  }
}
