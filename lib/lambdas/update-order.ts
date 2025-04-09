import { AppSyncEvent } from '../types/appsync';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const orderService = new OrderService();
const logger = new Logger({ serviceName: 'updateOrderLambda' });

interface UpdateOrderArgs {
  input: {
    id: string;
    status?: OrderStatus;
  };
}

export const updateOrder = async (
  event: AppSyncEvent<UpdateOrderArgs>,
  context: Context
): Promise<Order | null> => {
  logger.addContext(context);
  logger.info('Received request for updateOrder', { args: event.arguments });

  try {
    // Pass the raw input object to the service for validation
    const result = await orderService.updateOrderStatus(event.arguments.input);
    logger.info('Successfully updated order', { orderId: result?.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing updateOrder request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error; 
  }
};

updateOrder.path = __filename; 