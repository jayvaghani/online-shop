import { Order, OrderStatus } from '../entities/order.entity';
import { OrderDetail } from '../entities/order-detail.entity';
import { OrderRepository } from '../repositories/order.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { ProductRepository } from '../repositories/product.repository';
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { ValidationError } from '../errors/validation.error';
import { NotFoundError } from '../errors/not-found.error';
import { ConflictError } from '../errors/conflict.error';
import { validateInput, CreateOrderSchema, UpdateOrderStatusSchema } from '../validation/schemas';

// Input structure for creating order details within the service
// interface CreateOrderDetailInput {
//     productId: string;
//     quantity: number;
// }

// Removed inheritance from BaseService
export class OrderService {
  private orderRepository: OrderRepository;
  private customerRepository: CustomerRepository;
  private productRepository: ProductRepository;

  // Simplified constructor with defaults for necessary repositories
  constructor(
    orderRepository: OrderRepository = new OrderRepository(),
    customerRepository: CustomerRepository = new CustomerRepository(),
    productRepository: ProductRepository = new ProductRepository()
  ) {
    this.orderRepository = orderRepository;
    this.customerRepository = customerRepository;
    this.productRepository = productRepository;
  }

  // --- Corrected Methods --- 

  // Use GSI2 for direct lookup
  async getOrderById(orderId: string): Promise<Order | null> {
    return this.orderRepository.findOrderById_GSI2(orderId);
  }

  // Optional: Get Order with Details (can also be handled by field resolvers)
  async getOrderWithDetails(orderId: string): Promise<(Order & { details?: OrderDetail[] }) | null> {
    const order = await this.orderRepository.findOrderById_GSI2(orderId);
    if (order) {
        (order as any).details = await this.orderRepository.getOrderDetails(order.id);
    }
    return order;
}


  async listOrdersByCustomer(customerId: string, limit?: number, nextToken?: string): Promise<{ items: Order[]; nextToken: string | null }> {
    const customer = await this.customerRepository.getCustomerById(customerId);
    if (!customer) {
        throw new NotFoundError(`Customer with ID ${customerId} not found.`);
    }
    return this.orderRepository.listOrdersByCustomer(customerId, limit, nextToken);
  }

  async listAllOrders(limit?: number, nextToken?: string): Promise<{ items: Order[]; nextToken: string | null }> {
    return this.orderRepository.listAllOrders(limit, nextToken);
  }

  async createOrder(rawInput: unknown): Promise<Order> {
    const input = validateInput(CreateOrderSchema, rawInput);
    const { customerId, details } = input;

    if (!customerId || !details || details.length === 0) {
      throw new ValidationError('Customer ID and at least one order detail are required');
    }

    const customer = await this.customerRepository.getCustomerById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    let totalAmount = 0;
    const orderDetailEntities: OrderDetail[] = [];
    const orderId = uuid();

    for (const detailInput of details) {
      const product = await this.productRepository.getProductById(detailInput.productId);
      if (!product) {
        throw new NotFoundError(`Product with ID ${detailInput.productId} not found`);
      }
      
      const lineItemPrice = product.price; 
      totalAmount += lineItemPrice * detailInput.quantity;
      
      const detailId = uuid();
      orderDetailEntities.push(
        new OrderDetail(
          detailId, orderId, detailInput.productId, product.name, 
          detailInput.quantity, lineItemPrice
        )
      );
    }

    const newOrder = new Order(orderId, customerId, totalAmount, OrderStatus.PENDING);
    return this.orderRepository.createOrderWithDetails(newOrder, orderDetailEntities);
  }

  async updateOrderStatus(rawInput: unknown): Promise<Order | null> {
    const input = validateInput(UpdateOrderStatusSchema, rawInput);
    const { id, status } = input;

    const orderToUpdate = await this.orderRepository.findOrderById_GSI2(id);
    if (!orderToUpdate) {
         throw new NotFoundError(`Order with ID ${id} not found.`);
    }
    const customerId = orderToUpdate.customerId;
    
    if (!Object.values(OrderStatus).includes(status)) {
      throw new ValidationError(`Invalid status value: ${status}`);
    }
    
    if (orderToUpdate.status === OrderStatus.DELIVERED || orderToUpdate.status === OrderStatus.CANCELLED) {
      throw new ConflictError(`Order is already ${orderToUpdate.status} and cannot be updated.`);
    }

    return this.orderRepository.updateOrderStatus(customerId, id, status);
  }

  // --- Removed Old/Incorrect Methods ---
  // Removed: findByCustomer, findByDateRange, findAllOrders
} 