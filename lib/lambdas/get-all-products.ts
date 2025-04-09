import { AppSyncEvent } from '../types/appsync';
import { Product } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const productService = new ProductService();
const logger = new Logger({ serviceName: 'getAllProductsLambda' });

interface ListProductsArgs {
  limit?: number;
  nextToken?: string;
}

export const getAllProducts = async (
  event: AppSyncEvent<ListProductsArgs>,
  context: Context
): Promise<{ items: Product[]; nextToken: string | null }> => {
  logger.addContext(context);
  logger.info('Received request for getAllProducts', { args: event.arguments });

  try {
    const { limit, nextToken } = event.arguments;
    const result = await productService.getAllProducts(limit, nextToken);
    logger.info('Successfully fetched all products', { itemCount: result.items.length, hasNextToken: !!result.nextToken });
    return result;
  } catch (error: any) {
    logger.error('Error processing getAllProducts request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

getAllProducts.path = __filename; 