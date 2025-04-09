import { AppSyncEvent } from '../types/appsync';
import { Product } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const productService = new ProductService();
const logger = new Logger({ serviceName: 'getProductByIdLambda' });

interface GetProductByIdArgs {
  id: string;
}

export const getProductById = async (
  event: AppSyncEvent<GetProductByIdArgs>,
  context: Context
): Promise<Product | null> => {
  logger.addContext(context);
  logger.info('Received request for getProductById', { args: event.arguments });

  try {
    const { id } = event.arguments; 
    if (!id) {
      logger.warn('Missing Product ID argument');
      throw new Error('Product ID is required');
    }
    const result = await productService.getProductById(id);
    logger.info('Successfully fetched product by ID', { productId: id, found: !!result });
    return result;
  } catch (error: any) {
    logger.error('Error processing getProductById request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

getProductById.path = __filename; 