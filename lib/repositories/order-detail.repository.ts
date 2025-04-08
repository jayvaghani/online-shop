import { BaseRepository } from './base.repository';
import { OrderDetail } from '../entities/order-detail.entity';

export class OrderDetailRepository extends BaseRepository<OrderDetail> {
  constructor() {
    super();
    
    // Initialize with mock data
    const mockOrderDetails: OrderDetail[] = [
      new OrderDetail(
        'ORDD1',
        'ORD1',
        'PROD1',
        'Laptop Pro', // Product name
        1,
        999.99
      ),
      new OrderDetail(
        'ORDD2',
        'ORD1',
        'PROD2',
        'Wireless Mouse', // Product name
        2,
        29.99
      ),
      new OrderDetail(
        'ORDD3',
        'ORD2',
        'PROD3',
        'Gaming Keyboard', // Product name
        1,
        149.99
      ),
      new OrderDetail(
        'ORDD4',
        'ORD3',
        'PROD1',
        'Laptop Pro', // Product name
        1,
        999.99
      ),
    ];
    
    mockOrderDetails.forEach(detail => this.items.set(detail.id, detail));
  }

  async findByOrder(orderId: string): Promise<OrderDetail[]> {
    return Array.from(this.items.values()).filter(detail => detail.orderId === orderId);
  }

  async findByProduct(productId: string): Promise<OrderDetail[]> {
    return this.findByGSI1(`PROD#${productId}`, '');
  }

  async findAllOrderDetails(): Promise<OrderDetail[]> {
    return Array.from(this.items.values());
  }
} 