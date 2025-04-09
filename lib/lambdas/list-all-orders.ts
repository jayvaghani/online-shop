import { AppSyncEvent } from '../types/appsync';
import { Order } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const orderService = new OrderService();
const logger = new Logger({ serviceName: 'listAllOrdersLambda' });

interface ListAllOrdersArgs {
  limit?: number;
  nextToken?: string;
}

export const listAllOrders = async (
  event: AppSyncEvent<ListAllOrdersArgs>,
  context: Context
): Promise<{ items: Order[]; nextToken: string | null }> => {
  logger.addContext(context);
  logger.info('Received request for listAllOrders', { args: event.arguments });

  try {
    const { limit, nextToken } = event.arguments;
    const result = await orderService.listAllOrders(limit, nextToken);
    logger.info('Successfully listed all orders', { itemCount: result.items.length, hasNextToken: !!result.nextToken });
    return result;
  } catch (error: any) {
    logger.error('Error processing listAllOrders request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error; 
  }
};

listAllOrders.path = __filename; 