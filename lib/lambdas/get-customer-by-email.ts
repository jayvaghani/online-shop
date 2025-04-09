import { AppSyncEvent } from '../types/appsync';
import { Customer } from '../entities/customer.entity';
import { CustomerService } from '../services/customer.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const customerService = new CustomerService();
const logger = new Logger({ serviceName: 'getCustomerByEmailLambda' });

interface GetCustomerByEmailArgs {
  email: string;
}

export const getCustomerByEmail = async (
  event: AppSyncEvent<GetCustomerByEmailArgs>,
  context: Context
): Promise<Customer | null> => {
  logger.addContext(context);
  logger.info('Received request for getCustomerByEmail', { args: event.arguments });

  try {
    const { email } = event.arguments;
    if (!email) {
      logger.warn('Missing email argument');
      throw new Error('Email is required');
    }
    const result = await customerService.getCustomerByEmail(email);
    logger.info('Successfully fetched customer by email', { email, customerId: result?.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing getCustomerByEmail request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

getCustomerByEmail.path = __filename; 