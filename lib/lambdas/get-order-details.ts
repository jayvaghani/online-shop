import { AppSyncEvent } from '../types/appsync';
import { Order } from '../entities/order.entity'; // Need Order type for source
import { OrderDetail } from '../entities/order-detail.entity';
import { OrderRepository } from '../repositories/order.repository';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda'; // Add Context import

const orderRepository = new OrderRepository();
const logger = new Logger({ serviceName: 'getOrderDetailsLambda' });

// This resolver is triggered for the 'details' field on an 'Order' type.
// The source object ($context.source in VTL) contains the parent Order.
export const getOrderDetails = async (
  event: AppSyncEvent<any, Order>, // Arguments are likely null, Source is the Order
  context: Context // Add context parameter
): Promise<OrderDetail[]> => {
  logger.addContext(context); // Corrected context logging
  logger.info('Received request for getOrderDetails (field resolver)', { sourceOrderId: event.source?.id });

  try {
    const orderId = event.source?.id; // Get orderId from the parent Order object
    if (!orderId) {
      logger.error('Order ID not found in source for Order.details resolver', { source: event.source });
      // Throwing here will make the parent query fail if details are requested but source is missing
      throw new Error('Cannot resolve details without Order ID from source');
    }
    
    // Use the repository method designed to get details by order ID
    const details = await orderRepository.getOrderDetails(orderId);
    logger.info('Successfully fetched order details', { orderId, detailCount: details.length });
    return details;

  } catch (error: any) {
    logger.error('Error processing getOrderDetails request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        sourceId: event.source?.id // Log the source ID if available
    });
    throw error; // Let AppSync handle the error
  }
};

getOrderDetails.path = __filename; 