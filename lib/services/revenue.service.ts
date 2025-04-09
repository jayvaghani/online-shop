import { Revenue } from '../entities/revenue.entity';
import { RevenueRepository } from '../repositories/revenue.repository';
import { ValidationError } from '../errors/validation.error';
import { z } from 'zod';
import { validateInput } from '../validation/schemas';

// Define schema for recordRevenue input
const RecordRevenueSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format"}),
    amount: z.number().positive({ message: "Amount must be positive" })
});

export class RevenueService {
  private revenueRepository: RevenueRepository;

  constructor(repository: RevenueRepository = new RevenueRepository()) {
    this.revenueRepository = repository;
  }

  async getTotalRevenue(startDate: string, endDate: string): Promise<number> {
    // Add date validation if desired
    const revenues = await this.revenueRepository.listRevenueByDateRange(startDate, endDate);
    return revenues.reduce((total, revenue) => total + revenue.sum, 0);
  }

  async getDailyRevenue(date: string): Promise<number> {
    // Add date validation if desired
    const revenue = await this.revenueRepository.getRevenueByDate(date);
    // Don't throw NotFound if no revenue for the date, just return 0
    return revenue ? revenue.sum : 0; 
  }

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    if (month < 1 || month > 12) {
        throw new ValidationError("Invalid month provided.");
    }
    const formattedMonth = month.toString().padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${formattedMonth}-${lastDay}`;
    return this.getTotalRevenue(startDate, endDate);
  }

  async getYearlyRevenue(year: number): Promise<number> {
    // Add year validation if desired
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return this.getTotalRevenue(startDate, endDate);
  }
  
  async recordRevenue(rawInput: unknown): Promise<number> {
      // Validate input first
      const input = validateInput(RecordRevenueSchema, rawInput);
      const { date, amount } = input; // Use validated data

      // Call repository method (validation already done)
      return this.revenueRepository.addRevenueForDate(date, amount);
  }
} 