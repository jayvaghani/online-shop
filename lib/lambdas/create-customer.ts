import { AppSyncEvent } from '../types/appsync';
import { Customer } from '../entities/customer.entity';
import { CustomerService } from '../services/customer.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const customerService = new CustomerService();
const logger = new Logger({ serviceName: 'createCustomerLambda' });

interface CreateCustomerArgs {
  input: {
    name: string;
    email: string;
    address: string;
  };
}

export const createCustomer = async (
  event: AppSyncEvent<CreateCustomerArgs>,
  context: Context
): Promise<Customer> => {
  logger.addContext(context);
  logger.info('Received request for createCustomer', { args: event.arguments });

  try {
    const result = await customerService.createCustomer(event.arguments.input);
    logger.info('Successfully created customer', { customerId: result.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing createCustomer request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

createCustomer.path = __filename; 