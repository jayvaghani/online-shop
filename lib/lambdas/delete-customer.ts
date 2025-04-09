import { AppSyncEvent } from '../types/appsync';
import { CustomerService } from '../services/customer.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const customerService = new CustomerService();
const logger = new Logger({ serviceName: 'deleteCustomerLambda' });

interface DeleteCustomerArgs {
  id: string;
}

export const deleteCustomer = async (
  event: AppSyncEvent<DeleteCustomerArgs>,
  context: Context
): Promise<boolean> => {
  logger.addContext(context);
  logger.info('Received request for deleteCustomer', { args: event.arguments });

  try {
    const { id } = event.arguments;
    if (!id) {
      logger.warn('Missing Customer ID for deletion');
      throw new Error('Customer ID is required for deletion');
    }
    const result = await customerService.deleteCustomer(id);
    logger.info('Successfully deleted customer', { customerId: id, result });
    return result;
  } catch (error: any) {
    logger.error('Error processing deleteCustomer request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

deleteCustomer.path = __filename; 