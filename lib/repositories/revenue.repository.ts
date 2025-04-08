import { BaseRepository } from './base.repository';
import { Revenue } from '../entities/revenue.entity';

export class RevenueRepository extends BaseRepository<Revenue> {
  constructor() {
    super();
    // Initialize with mock data
    const revenues = [
      new Revenue('1', '2024-03-01', 1699.98),
      new Revenue('2', '2024-03-02', 39.98),
      new Revenue('3', '2024-03-03', 49.99),
      new Revenue('4', '2024-03-04', 29.99),
      new Revenue('5', '2024-03-05', 104.98)
    ];
    revenues.forEach(revenue => this.items.set(revenue.id, revenue));
  }

  async findByDate(date: string): Promise<Revenue[]> {
    return Array.from(this.items.values()).filter(
      item => item.PK === `REV#${date}`
    );
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Revenue[]> {
    return Array.from(this.items.values()).filter(
      item => item.date >= startDate && item.date <= endDate
    );
  }

  async findAllRevenues(): Promise<Revenue[]> {
    return this.findByGSI1('REV', '');
  }
} 