import { BaseService } from './base.service';
import { Revenue } from '../entities/revenue.entity';
import { RevenueRepository } from '../repositories/revenue.repository';

export class RevenueService extends BaseService<Revenue> {
  constructor(repository: RevenueRepository) {
    super(repository);
  }

  async findByDate(date: string): Promise<Revenue[]> {
    return (this.repository as RevenueRepository).findByDate(date);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Revenue[]> {
    return (this.repository as RevenueRepository).findByDateRange(startDate, endDate);
  }

  async findAllRevenues(): Promise<Revenue[]> {
    return (this.repository as RevenueRepository).findAllRevenues();
  }

  async getTotalRevenue(startDate: string, endDate: string): Promise<number> {
    const revenues = await this.findByDateRange(startDate, endDate);
    return revenues.reduce((total, revenue) => total + revenue.sum, 0);
  }

  async getDailyRevenue(date: string): Promise<number> {
    const revenues = await this.findByDate(date);
    return revenues.reduce((total, revenue) => total + revenue.sum, 0);
  }

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    // Format month with leading zero if needed
    const formattedMonth = month.toString().padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
    
    // Calculate the last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${formattedMonth}-${lastDay}`;
    
    return this.getTotalRevenue(startDate, endDate);
  }

  async getYearlyRevenue(year: number): Promise<number> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    return this.getTotalRevenue(startDate, endDate);
  }
} 