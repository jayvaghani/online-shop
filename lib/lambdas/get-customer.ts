import { AppSyncEvent } from '../types/appsync';
import { Customer } from '../entities/customer.entity';
import { CustomerService } from '../services/customer.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const customerService = new CustomerService();
const logger = new Logger({ serviceName: 'getCustomerLambda' });

interface GetCustomerArgs {
  id: string;
}

export const getCustomer = async (
  event: AppSyncEvent<GetCustomerArgs>,
  context: Context
): Promise<Customer | null> => {
  logger.addContext(context);
  logger.info('Received request for getCustomer', { args: event.arguments });

  try {
    const { id } = event.arguments;
    if (!id) {
      logger.warn('Missing Customer ID argument');
      throw new Error('Customer ID is required');
    }
    const result = await customerService.getCustomerById(id);
    logger.info('Successfully fetched customer', { customerId: id, found: !!result });
    return result;
  } catch (error: any) {
    logger.error('Error processing getCustomer request', { 
      errorName: error.name,
      errorMessage: error.message,
        errorStack: error.stack, 
      eventArguments: event.arguments
    });
    throw error;
  }
};

getCustomer.path = __filename; 