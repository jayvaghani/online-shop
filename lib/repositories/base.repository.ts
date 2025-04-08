import { BaseEntity } from '../entities/base.entity';

export abstract class BaseRepository<T extends BaseEntity> {
  protected items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async save(item: T): Promise<T> {
    this.items.set(item.id, item);
    return item;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async findByPKAndSK(PK: string, SK: string): Promise<T | null> {
    return Array.from(this.items.values()).find(
      item => item.PK === PK && item.SK === SK
    ) || null;
  }

  async findByGSI1(GSI1PK: string, GSI1SK: string): Promise<T[]> {
    return Array.from(this.items.values()).filter(
      item => item.GSI1PK === GSI1PK && item.GSI1SK === GSI1SK
    );
  }

  async findByGSI2(GSI2PK: string, GSI2SK: string): Promise<T[]> {
    return Array.from(this.items.values()).filter(
      item => item.GSI2PK === GSI2PK && item.GSI2SK === GSI2SK
    );
  }
} 