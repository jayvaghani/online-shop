import { Order, OrderStatus } from '../entities/order.entity';
import { OrderDetail } from '../entities/order-detail.entity';
import { OrderRepository } from '../repositories/order.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { ProductRepository } from '../repositories/product.repository';
import { v4 as uuid } from 'uuid';
import { ValidationError } from '../errors/validation.error';
import { NotFoundError } from '../errors/not-found.error';
import { ConflictError } from '../errors/conflict.error';
import { validateInput, CreateOrderSchema, UpdateOrderStatusSchema } from '../validation/schemas';
import { Logger } from '@aws-lambda-powertools/logger';
import { EmailService, SendEmailParams } from './email.service';
import { TemplateService } from './template.service';

// Input structure for creating order details within the service
// interface CreateOrderDetailInput {
//     productId: string;
//     quantity: number;
// }

// Interface for customer details needed for email
interface CustomerEmailDetails {
    email: string;
    name: string;
}

// Removed inheritance from BaseService
export class OrderService {
  private orderRepository: OrderRepository;
  private customerRepository: CustomerRepository;
  private productRepository: ProductRepository;
  // --- Added for email sending ---
  private readonly logger = new Logger({ serviceName: 'OrderService' });
  private readonly emailService: EmailService;
  private readonly templateService: TemplateService;
  // -------------------------------

  // Simplified constructor with defaults for necessary repositories
  constructor() {
    this.orderRepository = new OrderRepository()
    this.customerRepository = new CustomerRepository()
    this.productRepository = new ProductRepository()
    this.emailService = new EmailService()
    this.templateService = new TemplateService()
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
    // Validation now includes userEmail, shippingAddress and excludes customerId
    const input = validateInput(CreateOrderSchema, rawInput);
    // Destructure userEmail, details, and shippingAddress from the validated input
    const { userEmail, details, shippingAddress } = input;

    // Check userEmail, details, and shippingAddress
    if (!userEmail || !details || details.length === 0 || !shippingAddress) {
      // Should not happen if validation schema is correct, but good practice
      throw new ValidationError('User email, shipping address, and at least one order detail are required');
    }

    // --- Get Customer by Email ---
    const customer = await this.customerRepository.getCustomerByEmail(userEmail);
    if (!customer) {
      // Customer associated with the token's email not found in DB
      // You might want to auto-create the customer here, or throw an error
      // depending on your application logic. For now, throwing an error.
      throw new NotFoundError(`Customer with email ${userEmail} not found. Cannot create order.`);
    }
    const customerId = customer.id; // Get the customer ID from the found customer
    // ---------------------------

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

    // Use the fetched customerId and the input shippingAddress when creating the Order entity
    const newOrder = new Order(orderId, customerId, totalAmount, shippingAddress, OrderStatus.PENDING);
    // Await the creation before sending email based on the created order
    const createdOrder = await this.orderRepository.createOrderWithDetails(newOrder, orderDetailEntities);

    return createdOrder; // Return the order DTO/Entity
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

  // --- Method Updated to Use TemplateService and EmailService ---
  async sendOrderConfirmationEmail(orderId: string): Promise<void> {
      this.logger.info("Processing order confirmation email", { orderId });

      // 1. Fetch Order and Details
      const orderData = await this.getOrderWithDetails(orderId);
      // Ensure details are present
      if (!orderData || !orderData.details || orderData.details.length === 0) {
          this.logger.error("Order or order details not found/empty for email confirmation.", { orderId });
          throw new NotFoundError(`Order with ID ${orderId} or its details not found/empty.`);
      }

      // 2. Fetch Customer Details
      let customerDetails: CustomerEmailDetails;
      try {
          const customer = await this.customerRepository.getCustomerById(orderData.customerId);
          if (!customer || !customer.email) {
              throw new NotFoundError(`Customer ${orderData.customerId} or their email not found.`);
          }
          customerDetails = { email: customer.email, name: customer.name || 'Valued Customer' };
      } catch (error) {
          this.logger.error("Error fetching customer details for email", { error: error as Error, customerId: orderData.customerId, orderId });
          throw new Error(`Failed to fetch customer details: ${(error as Error).message}`);
      }

      // 3. Prepare Email Body using TemplateService
      let htmlBody: string;
      try {
          htmlBody = this.templateService.prepareOrderConfirmationEmail(orderData as Order & { details: OrderDetail[] }, customerDetails);
      } catch (error) {
          this.logger.error("Error preparing order confirmation email body using TemplateService", { error: error as Error, orderId });
          // Re-throw or handle as appropriate (e.g., send plain text fallback?)
          throw error;
      }

      // 4. Prepare parameters for EmailService
      const emailParams: SendEmailParams = {
          to: customerDetails.email,
          subject: `Your Online Shop Order Confirmation (ID: ${orderData.id})`,
          htmlBody: htmlBody, // Use the body prepared by TemplateService
      };

      // 5. Call EmailService to send the email
      try {
          this.logger.info("Calling EmailService to send order confirmation", { recipient: emailParams.to, orderId });
          await this.emailService.sendEmail(emailParams);
          this.logger.info("Successfully requested email sending via EmailService", { recipient: emailParams.to, orderId });
      } catch (error) {
          this.logger.error("Error occurred when calling EmailService", { error: error as Error, recipient: emailParams.to, orderId });
          // Re-throw to allow caller (async catch block in createOrder) to handle
          throw error;
      }
  }

  // --- Added sendShipmentConfirmationEmail ---
  async sendShipmentConfirmationEmail(orderId: string /*, trackingInfo?: { trackingNumber: string; carrier: string } */): Promise<void> {
      this.logger.info("Processing shipment confirmation email", { orderId }); // Log start

      // 1. Fetch Order (basic details are likely sufficient)
      const orderData = await this.getOrderById(orderId); // Using the basic fetch method
      if (!orderData) {
          this.logger.error("Order not found for shipment confirmation.", { orderId });
          throw new NotFoundError(`Order with ID ${orderId} not found.`);
      }
      // Optional: Check status
      // if (orderData.status !== OrderStatus.SHIPPED) { ... }

      // 2. Fetch Customer Details
      let customerDetails: CustomerEmailDetails;
      try {
          const customer = await this.customerRepository.getCustomerById(orderData.customerId);
          if (!customer || !customer.email) {
              throw new NotFoundError(`Customer ${orderData.customerId} or their email not found.`);
          }
          customerDetails = { email: customer.email, name: customer.name || 'Valued Customer' };
          this.logger.info(`Successfully fetched customer details for shipment email`, { customerId: orderData.customerId, orderId });
      } catch (error) {
          this.logger.error("Error fetching customer details for shipment email", { error: error as Error, customerId: orderData.customerId, orderId });
          throw new Error(`Failed to fetch customer details: ${(error as Error).message}`);
      }

      // 3. Prepare Email Body using TemplateService
      let htmlBody: string;
      try {
          // Call the specific template preparation method
          htmlBody = this.templateService.prepareShipmentConfirmationEmail(
              orderData.id,
              customerDetails.name
              // Pass trackingInfo if added
          );
      } catch (error) {
          this.logger.error("Error preparing shipment confirmation email body using TemplateService", { error: error as Error, orderId });
          throw error; // Re-throw
      }

      // 4. Prepare parameters for EmailService
      const emailParams: SendEmailParams = {
          to: customerDetails.email,
          subject: `Your Order ${orderData.id} Has Shipped!`, // Custom subject line
          htmlBody: htmlBody,
      };

      // 5. Call EmailService to send the email
      try {
          this.logger.info("Calling EmailService to send shipment confirmation", { recipient: emailParams.to, orderId });
          await this.emailService.sendEmail(emailParams);
          this.logger.info("Successfully requested shipment email sending via EmailService", { recipient: emailParams.to, orderId });
      } catch (error) {
          this.logger.error("Error occurred when calling EmailService for shipment confirmation", { error: error as Error, recipient: emailParams.to, orderId });
          throw error; // Re-throw
      }
  }

  // --- New Method for Sending Feedback Request Email ---
  async sendFeedbackRequestEmail(orderId: string): Promise<void> {
      this.logger.info("Processing feedback request email", { orderId });

      // 1. Fetch Order to get customerId
      const orderData = await this.getOrderById(orderId);
      if (!orderData) {
          this.logger.error("Order not found for feedback request.", { orderId });
          throw new NotFoundError(`Order with ID ${orderId} not found.`);
      }
      // Optional: Check order status (e.g., only send feedback for DELIVERED orders)
      // if (orderData.status !== OrderStatus.DELIVERED) {
      //     this.logger.warn("Feedback request skipped: Order not yet delivered.", { orderId, status: orderData.status });
      //     return; // Exit gracefully without error
      // }

      // 2. Fetch Customer Details using customerId from the order
      let customerDetails: CustomerEmailDetails;
      try {
          const customer = await this.customerRepository.getCustomerById(orderData.customerId);
          if (!customer || !customer.email) {
              throw new NotFoundError(`Customer ${orderData.customerId} or their email not found.`);
          }
          customerDetails = { email: customer.email, name: customer.name || 'Valued Customer' };
          this.logger.info(`Successfully fetched customer details for feedback email`, { customerId: orderData.customerId, orderId });
      } catch (error) {
          this.logger.error("Error fetching customer details for feedback email", { error: error as Error, customerId: orderData.customerId, orderId });
          throw new Error(`Failed to fetch customer details: ${(error as Error).message}`);
      }

      // 3. Prepare Email Body using TemplateService
      let htmlBody: string;
      try {
          htmlBody = this.templateService.prepareFeedbackRequestEmail(
              customerDetails.name
          );
      } catch (error) {
          this.logger.error("Error preparing feedback request email body using TemplateService", { error: error as Error, orderId });
          throw error; // Re-throw
      }

      // 4. Prepare parameters for EmailService
      const emailParams: SendEmailParams = {
          to: customerDetails.email,
          subject: `How was your recent order? (ID: ${orderData.id})`, // Customize subject
          htmlBody: htmlBody,
      };

      // 5. Call EmailService to send the email
      try {
          this.logger.info("Calling EmailService to send feedback request", { recipient: emailParams.to, orderId });
          await this.emailService.sendEmail(emailParams);
          this.logger.info("Successfully requested feedback email sending via EmailService", { recipient: emailParams.to, orderId });
      } catch (error) {
          this.logger.error("Error occurred when calling EmailService for feedback request", { error: error as Error, recipient: emailParams.to, orderId });
          throw error; // Re-throw
      }
  }
  // ----------------------------------------------------
} 