import { BaseEntity } from '../entities/base.entity';
import { BaseRepository } from '../repositories/base.repository';

export abstract class BaseService<T extends BaseEntity> {
  constructor(protected repository: BaseRepository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findById(id);
  }

  async findAll(): Promise<T[]> {
    return this.repository.findAll();
  }

  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
} 