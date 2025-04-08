import { BaseService } from './base.service';
import { Order } from '../entities/order.entity';
import { OrderDetail } from '../entities/order-detail.entity';
import { Revenue } from '../entities/revenue.entity';
import { OrderRepository } from '../repositories/order.repository';
import { OrderDetailRepository } from '../repositories/order-detail.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { ProductRepository } from '../repositories/product.repository';
import { RevenueRepository } from '../repositories/revenue.repository';

export class OrderService extends BaseService<Order> {
  private orderDetailRepository: OrderDetailRepository;
  private customerRepository: CustomerRepository;
  private productRepository: ProductRepository;
  private revenueRepository: RevenueRepository;

  constructor(
    repository: OrderRepository,
    orderDetailRepository: OrderDetailRepository,
    customerRepository: CustomerRepository,
    productRepository: ProductRepository,
    revenueRepository: RevenueRepository
  ) {
    super(repository);
    this.orderDetailRepository = orderDetailRepository;
    this.customerRepository = customerRepository;
    this.productRepository = productRepository;
    this.revenueRepository = revenueRepository;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return (this.repository as OrderRepository).findByCustomer(customerId);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    return (this.repository as OrderRepository).findByDateRange(startDate, endDate);
  }

  async findAllOrders(): Promise<Order[]> {
    return (this.repository as OrderRepository).findAllOrders();
  }

  async getOrderWithDetails(orderId: string): Promise<{
    order: Order | null;
    details: any[];
    customer: any | null;
  }> {
    const order = await this.findById(orderId);
    if (!order) {
      return { order: null, details: [], customer: null };
    }

    const details = await this.orderDetailRepository.findByOrder(orderId);
    const customer = await this.customerRepository.findById(order.customerId);

    return { order, details, customer };
  }

  async createOrder(
    customerId: string,
    items: { productId: string; quantity: number }[],
    shippingAddress: {
      country: string;
      city: string;
      county: string;
      streetAddress: string;
    }
  ): Promise<Order> {
    // Validate customer exists
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Generate order ID
    const orderId = `ORD${Date.now()}`;

    // Create order
    const order = new Order(
      orderId,
      customerId,
      shippingAddress.country,
      shippingAddress.city,
      shippingAddress.county,
      shippingAddress.streetAddress,
      0 // Initial total amount, will be updated later
    );

    // Save order
    await this.repository.save(order);

    // Create order details and calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      // Get product
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // Calculate item total
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      // Create order detail
      const orderDetailId = `ORDD${Date.now()}_${item.productId}`;
      const orderDetail = new OrderDetail(
        orderDetailId,
        orderId,
        item.productId,
        product.name, // Include product name for denormalization
        item.quantity,
        product.price
      );

      // Save order detail
      await this.orderDetailRepository.save(orderDetail);
    }

    // Update order with total amount
    order.totalAmount = totalAmount;
    await this.repository.save(order);

    // Create revenue entry
    const revenue = new Revenue(
      `REV${Date.now()}`,
      new Date().toISOString().split('T')[0], // Today's date
      totalAmount
    );
    await this.revenueRepository.save(revenue);

    return order;
  }

  async updateOrderStatus(id: string, status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error(`Order with ID '${id}' not found`);
    }

    // Create a new order with updated status
    const updatedOrder = new Order(
      id,
      order.customerId,
      order.country,
      order.city,
      order.county,
      order.streetAddress,
      order.totalAmount
    );
    updatedOrder.status = status;
    
    return this.save(updatedOrder);
  }
} 