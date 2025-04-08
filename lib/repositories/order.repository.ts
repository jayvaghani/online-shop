import { BaseRepository } from './base.repository';
import { Order } from '../entities/order.entity';

export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super();
    // Initialize with mock data
    const orders = [
      new Order('1', '1', 'US', 'New York', 'Manhattan', '123 Main St', 999.99),
      new Order('2', '1', 'US', 'New York', 'Brooklyn', '456 Park Ave', 1499.99),
      new Order('3', '2', 'US', 'Los Angeles', 'Hollywood', '789 Sunset Blvd', 799.99),
      new Order('4', '3', 'US', 'Chicago', 'Downtown', '321 State St', 599.99),
      new Order('5', '4', 'US', 'San Francisco', 'Financial District', '555 Market St', 1299.99)
    ];
    orders.forEach(order => this.items.set(order.id, order));
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return Array.from(this.items.values()).filter(
      item => item.PK === `CUST#${customerId}`
    );
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    return Array.from(this.items.values()).filter(
      item => item.createdAt >= startDate && item.createdAt <= endDate
    );
  }

  async findAllOrders(): Promise<Order[]> {
    return this.findByGSI1('ORDER', '');
  }
} 