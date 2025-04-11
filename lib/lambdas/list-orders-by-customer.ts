import { AppSyncEvent } from '../types/appsync';
import { Order } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const orderService = new OrderService();
const logger = new Logger({ serviceName: 'listOrdersByCustomerLambda' });

interface ListOrdersByCustomerArgs {
  customerId: string;
  limit?: number;
  nextToken?: string;
}

export const listOrdersByCustomer = async (
  event: AppSyncEvent<ListOrdersByCustomerArgs>,
  context: Context
): Promise<{ items: Order[]; nextToken: string | null }> => {
  logger.addContext(context);
  logger.info('Received request for listOrdersByCustomer', { args: event.arguments });

  try {
    const { customerId, limit, nextToken } = event.arguments;
    if (!customerId) {
      logger.warn('Missing Customer ID argument');
      throw new Error('Customer ID is required');
    }
    const result = await orderService.listOrdersByCustomer(customerId, limit, nextToken);
    logger.info('Successfully listed orders by customer', { customerId, itemCount: result.items.length, hasNextToken: !!result.nextToken });
    return result;
  } catch (error: any) {
    logger.error('Error processing listOrdersByCustomer request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

listOrdersByCustomer.path = __filename; 