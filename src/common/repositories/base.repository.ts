import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Generic base repository providing common CRUD operations
 * Supports transactions and query building patterns
 */
@Injectable()
export class BaseRepository<T> {
  protected modelName: string;

  constructor(protected db: DatabaseService) {}

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.db[this.modelName].findUnique({
      where: { id },
    });
  }

  /**
   * Find records with optional filtering and pagination
   */
  async findMany(params?: {
    where?: Record<string, any>;
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
    include?: Record<string, boolean | any>;
  }): Promise<T[]> {
    return this.db[this.modelName].findMany(params);
  }

  /**
   * Count records matching criteria
   */
  async count(where?: Record<string, any>): Promise<number> {
    return this.db[this.modelName].count({ where });
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    return this.db[this.modelName].create({
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
    return this.db[this.modelName].update({
      where: { id },
      data,
    });
  }

  /**
   * Update multiple records matching criteria
   */
  async updateMany(params: {
    where: Record<string, any>;
    data: Partial<T>;
  }): Promise<number> {
    const result = await this.db[this.modelName].updateMany(params);
    return result.count;
  }

  /**
   * Delete a record by ID (soft delete if deletedAt field exists)
   */
  async delete(id: string, softDelete = true): Promise<T> {
    if (softDelete) {
      return this.db[this.modelName].update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }
    return this.db[this.modelName].delete({
      where: { id },
    });
  }

  /**
   * Permanently delete a record
   */
  async hardDelete(id: string): Promise<T> {
    return this.db[this.modelName].delete({
      where: { id },
    });
  }

  /**
   * Delete multiple records matching criteria
   */
  async deleteMany(
    where: Record<string, any>,
    softDelete = true,
  ): Promise<number> {
    if (softDelete) {
      const result = await this.db[this.modelName].updateMany({
        where,
        data: { deletedAt: new Date() },
      });
      return result.count;
    }
    const result = await this.db[this.modelName].deleteMany({ where });
    return result.count;
  }

  /**
   * Find or create a record
   */
  async findOrCreate(params: {
    where: Record<string, any>;
    create: Partial<T>;
  }): Promise<T> {
    return this.db[this.modelName].upsert({
      where: params.where,
      update: {},
      create: params.create,
    });
  }

  /**
   * Upsert a record
   */
  async upsert(params: {
    where: Record<string, any>;
    create: Partial<T>;
    update: Partial<T>;
  }): Promise<T> {
    return this.db[this.modelName].upsert(params);
  }

  /**
   * Find first record matching criteria
   */
  async findOne(params?: {
    where?: Record<string, any>;
    include?: Record<string, boolean | any>;
  }): Promise<T | null> {
    return this.db[this.modelName].findFirst(params);
  }

  /**
   * Check if record exists
   */
  async exists(where: Record<string, any>): Promise<boolean> {
    const count = await this.db[this.modelName].count({ where });
    return count > 0;
  }
}
