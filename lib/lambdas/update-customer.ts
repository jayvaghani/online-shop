import { AppSyncEvent } from '../types/appsync';
import { Customer } from '../entities/customer.entity';
import { CustomerService } from '../services/customer.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const customerService = new CustomerService();
const logger = new Logger({ serviceName: 'updateCustomerLambda' });

interface UpdateCustomerArgs {
  input: {
    id: string;
    name?: string;
    email?: string;
    address?: string;
  };
}

export const updateCustomer = async (
  event: AppSyncEvent<UpdateCustomerArgs>,
  context: Context
): Promise<Customer | null> => {
  logger.addContext(context);
  logger.info('Received request for updateCustomer', { args: event.arguments });

  try {
    // Pass the raw input object to the service for validation
    const result = await customerService.updateCustomer(event.arguments.input);
    logger.info('Successfully updated customer', { customerId: result?.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing updateCustomer request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

updateCustomer.path = __filename; 