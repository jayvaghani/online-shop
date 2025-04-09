import { AppSyncEvent } from '../types/appsync';
import { Customer } from '../entities/customer.entity';
import { CustomerService } from '../services/customer.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const customerService = new CustomerService();
const logger = new Logger({ serviceName: 'listCustomersLambda' });

interface ListCustomersArgs {
  limit?: number;
  nextToken?: string;
}

export const listCustomers = async (
  event: AppSyncEvent<ListCustomersArgs>,
  context: Context
): Promise<{ items: Customer[]; nextToken: string | null }> => {
  logger.addContext(context);
  logger.info('Received request for listCustomers', { args: event.arguments });

  try {
    const { limit, nextToken } = event.arguments;
    const result = await customerService.listCustomers(limit, nextToken);
    logger.info('Successfully listed customers', { itemCount: result.items.length, hasNextToken: !!result.nextToken });
    return result;
  } catch (error: any) {
    logger.error('Error processing listCustomers request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error; 
  }
};

listCustomers.path = __filename; 