import { AppSyncEvent } from '../types/appsync';
import { Order } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const orderService = new OrderService();
const logger = new Logger({ serviceName: 'createOrderLambda' });

// Matches schema input type
interface OrderDetailInput {
    productId: string;
    quantity: number;
}
interface CreateOrderArgs {
  input: {
    customerId: string;
    details: OrderDetailInput[];
  };
}

export const createOrder = async (
  event: AppSyncEvent<CreateOrderArgs>,
  context: Context
): Promise<Order> => {
  logger.addContext(context);
  logger.info('Received request for createOrder', { args: event.arguments });

  try {
    // Pass the raw input object to the service for validation
    const result = await orderService.createOrder(event.arguments.input);
    logger.info('Successfully created order', { orderId: result.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing createOrder request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

createOrder.path = __filename; 