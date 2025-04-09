import { AppSyncEvent } from '../types/appsync';
import { Order } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const orderService = new OrderService();
const logger = new Logger({ serviceName: 'getOrderLambda' });

interface GetOrderArgs {
  id: string;
  // We might need customerId here depending on how getOrderById is implemented in repo/service
  // If getOrder relies solely on its own ID (e.g., via GSI), customerId isn't needed.
  // If PK is CUST#<id> and SK is ORDER#<id>, we need customerId.
  // Let's assume for now the service layer handles finding the customerId if needed.
}

export const getOrder = async (
  event: AppSyncEvent<GetOrderArgs>,
  context: Context
): Promise<Order | null> => {
  logger.addContext(context);
  logger.info('Received request for getOrder', { args: event.arguments });

  try {
    const { id } = event.arguments;
    if (!id) {
      logger.warn('Missing Order ID argument');
      throw new Error('Order ID is required');
    }
    // Now calls the service method that uses GSI2
    const result = await orderService.getOrderById(id);
    logger.info('Successfully fetched order by ID', { orderId: id, found: !!result });
    return result;
  } catch (error: any) {
    logger.error('Error processing getOrder request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

getOrder.path = __filename; 