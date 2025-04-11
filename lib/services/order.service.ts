import { Order, OrderStatus, ShippingAddress } from '../entities/order.entity';
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
import { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } from '@aws-sdk/client-sfn';

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
  private readonly sfnClient: SFNClient;
  // -------------------------------

  // Simplified constructor with defaults for necessary repositories
  constructor() {
    this.orderRepository = new OrderRepository()
    this.customerRepository = new CustomerRepository()
    this.productRepository = new ProductRepository()
    this.emailService = new EmailService()
    this.templateService = new TemplateService()
    this.sfnClient = new SFNClient({});
  }

  // --- Corrected Methods --- 

  // Use GSI2 for direct lookup
  async getOrderById(orderId: string): Promise<Order | null> {
    return this.orderRepository.findOrderById_GSI2(orderId);
  }

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
    const { userEmail, details, shippingAddress } = input;

    if (!userEmail || !details || details.length === 0 || !shippingAddress) {
      throw new ValidationError('User email, shipping address, and at least one order detail are required');
    }

    const customer = await this.customerRepository.getCustomerByEmail(userEmail);
    if (!customer) {
      throw new NotFoundError(`Customer with email ${userEmail} not found. Cannot create order.`);
    }
    const customerId = customer.id;

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

    const newOrder = new Order(orderId, customerId, totalAmount, shippingAddress, OrderStatus.PENDING);
    const createdOrder = await this.orderRepository.createOrderWithDetails(newOrder, orderDetailEntities);

    return createdOrder;
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

  async sendOrderConfirmationEmail(orderId: string): Promise<void> {
      this.logger.info("Processing order confirmation email", { orderId });
      const orderData = await this.getOrderWithDetails(orderId);
      if (!orderData || !orderData.details || orderData.details.length === 0) {
          this.logger.error("Order or order details not found/empty for email confirmation.", { orderId });
          throw new NotFoundError(`Order with ID ${orderId} or its details not found/empty.`);
      }

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

      let htmlBody: string;
      try {
          htmlBody = this.templateService.prepareOrderConfirmationEmail(orderData as Order & { details: OrderDetail[] }, customerDetails);
      } catch (error) {
          this.logger.error("Error preparing order confirmation email body using TemplateService", { error: error as Error, orderId });
          throw error;
      }

      const emailParams: SendEmailParams = {
          to: customerDetails.email,
          subject: `Your Online Shop Order Confirmation (ID: ${orderData.id})`,
          htmlBody: htmlBody,
      };

      try {
          this.logger.info("Calling EmailService to send order confirmation", { recipient: emailParams.to, orderId });
          await this.emailService.sendEmail(emailParams);
          this.logger.info("Successfully requested email sending via EmailService", { recipient: emailParams.to, orderId });
      } catch (error) {
          this.logger.error("Error occurred when calling EmailService", { error: error as Error, recipient: emailParams.to, orderId });
          throw error;
      }
  }

  async sendShipmentConfirmationEmail(orderId: string ): Promise<void> {
      this.logger.info("Processing shipment confirmation email", { orderId });
      const orderData = await this.getOrderById(orderId);
      if (!orderData) {
          this.logger.error("Order not found for shipment confirmation.", { orderId });
          throw new NotFoundError(`Order with ID ${orderId} not found.`);
      }

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

      let htmlBody: string;
      try {
          htmlBody = this.templateService.prepareShipmentConfirmationEmail(
              orderData.id,
              customerDetails.name
          );
      } catch (error) {
          this.logger.error("Error preparing shipment confirmation email body using TemplateService", { error: error as Error, orderId });
          throw error;
      }

      const emailParams: SendEmailParams = {
          to: customerDetails.email,
          subject: `Your Order ${orderData.id} Has Shipped!`,
          htmlBody: htmlBody,
      };

      try {
          this.logger.info("Calling EmailService to send shipment confirmation", { recipient: emailParams.to, orderId });
          await this.emailService.sendEmail(emailParams);
          this.logger.info("Successfully requested shipment email sending via EmailService", { recipient: emailParams.to, orderId });
      } catch (error) {
          this.logger.error("Error occurred when calling EmailService for shipment confirmation", { error: error as Error, recipient: emailParams.to, orderId });
          throw error;
      }
  }

  async sendFeedbackRequestEmail(orderId: string): Promise<void> {
      this.logger.info("Processing feedback request email", { orderId });
      const orderData = await this.getOrderById(orderId);
      if (!orderData) {
          this.logger.error("Order not found for feedback request.", { orderId });
          throw new NotFoundError(`Order with ID ${orderId} not found.`);
      }

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

      let htmlBody: string;
      try {
          htmlBody = this.templateService.prepareFeedbackRequestEmail(
              customerDetails.name
          );
      } catch (error) {
          this.logger.error("Error preparing feedback request email body using TemplateService", { error: error as Error, orderId });
          throw error;
      }

      const emailParams: SendEmailParams = {
          to: customerDetails.email,
          subject: `How was your recent order? (ID: ${orderData.id})`,
          htmlBody: htmlBody,
      };

      try {
          this.logger.info("Calling EmailService to send feedback request", { recipient: emailParams.to, orderId });
          await this.emailService.sendEmail(emailParams);
          this.logger.info("Successfully requested feedback email sending via EmailService", { recipient: emailParams.to, orderId });
      } catch (error) {
          this.logger.error("Error occurred when calling EmailService for feedback request", { error: error as Error, recipient: emailParams.to, orderId });
          throw error;
      }
  }

  // --- New Method for Processing Approval Callback ---
  async processApprovalCallback(token: string, result: 'approve' | 'reject'): Promise<void> {
      this.logger.info("Processing approval callback", { result, token: '...' }); // Avoid logging full token

      if (result === 'approve') {
          const command = new SendTaskSuccessCommand({
              taskToken: token,
              output: JSON.stringify({}), // Step Functions requires stringified JSON output
          });
          try {
              await this.sfnClient.send(command);
              this.logger.info("Successfully sent task success for approval.");
          } catch (error) {
              this.logger.error("Error sending task success to Step Functions", { error: error as Error });
              // Decide how to handle SFN API errors - rethrow?
              throw error;
          }
      } else if (result === 'reject') {
          const command = new SendTaskFailureCommand({
              taskToken: token,
              error: 'ApprovalRejectedError', // Custom error name caught by State Machine
              cause: 'Shipment rejected by owner.', // Informative cause message
          });
          try {
              await this.sfnClient.send(command);
              this.logger.info("Successfully sent task failure for rejection.");
          } catch (error) {
              this.logger.error("Error sending task failure to Step Functions", { error: error as Error });
              throw error;
          }
      }
  }

  // --- New Method for Processing Rejection/Timeout ---
  async processRejection(orderId: string): Promise<void> {
      this.logger.warn("Processing rejection or timeout for order", { orderId });

      // 1. Fetch Customer Email (needed for notification)
      // We need the order first to get the customerId
      const orderData = await this.orderRepository.findOrderById_GSI2(orderId);
      if (!orderData) {
          // If order is already deleted or never existed, maybe just log and exit?
          this.logger.error("Order not found during rejection processing. Cannot delete or notify.", { orderId });
          // Throwing an error here might cause the Step Function to retry the rejection lambda indefinitely
          // Depending on desired behaviour, might be better to return successfully.
          // For now, let's throw NotFoundError as the rejection handler expects the order to exist.
          throw new NotFoundError(`Order ${orderId} not found during rejection processing.`); 
      }

      let customerDetails: CustomerEmailDetails;
      try {
          const customer = await this.customerRepository.getCustomerById(orderData.customerId);
          if (!customer || !customer.email) {
              this.logger.error("Customer or customer email not found during rejection processing.", { customerId: orderData.customerId, orderId });
              // Proceed with deletion but cannot notify
              customerDetails = { email: '', name: 'Valued Customer' }; // Placeholder
          } else {
              customerDetails = { email: customer.email, name: customer.name || 'Valued Customer' };
          }
      } catch (error) {
          this.logger.error("Error fetching customer details during rejection", { error: error as Error, customerId: orderData.customerId, orderId });
          // Proceed with deletion but cannot notify
          customerDetails = { email: '', name: 'Valued Customer' }; // Placeholder
      }

      // 2. Delete Order from Database
      try {
          this.logger.info("Attempting to delete order and details", { orderId });
          await this.orderRepository.deleteOrderWithDetails(orderId);
          this.logger.info("Successfully deleted order and details", { orderId });
      } catch (error) {
          // If deletion fails (e.g., DB error), log and re-throw to fail the Lambda/SFN Task
          this.logger.error("Failed to delete order from database", { error: error as Error, orderId });
          throw error;
      }

      // 3. Send Cancellation Email (only if email was found)
      if (customerDetails.email) {
          try {
              const htmlBody = this.templateService.prepareShipmentRejectedEmail(
                  orderId,
                  customerDetails.name
              );
              const emailParams: SendEmailParams = {
                  to: customerDetails.email,
                  subject: `Order Cancelled (ID: ${orderId})`,
                  htmlBody: htmlBody,
              };
              this.logger.info("Attempting to send cancellation email", { recipient: emailParams.to, orderId });
              await this.emailService.sendEmail(emailParams);
              this.logger.info("Successfully requested cancellation email sending", { recipient: emailParams.to, orderId });
          } catch (emailError) {
              // Log email error but don't fail the whole process, deletion is more critical
              this.logger.error("Failed to send cancellation email after order deletion", { error: emailError as Error, recipient: customerDetails.email, orderId });
          }
      } else {
          this.logger.warn("Skipping cancellation email as customer email was not found.", { orderId });
      }
  }

}