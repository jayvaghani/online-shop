import { AppSyncEvent } from '../types/appsync';
import { Product } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const productService = new ProductService();
const logger = new Logger({ serviceName: 'getProductsByCategoryLambda' });

interface GetProductsByCategoryArgs {
  categoryId: string;
  limit?: number;
  nextToken?: string;
}

export const getProductsByCategory = async (
  event: AppSyncEvent<GetProductsByCategoryArgs>,
  context: Context
): Promise<{ items: Product[]; nextToken: string | null }> => {
  logger.addContext(context);
  logger.info('Received request for getProductsByCategory', { args: event.arguments });

  try {
    const { categoryId, limit, nextToken } = event.arguments;
    if (!categoryId) {
      logger.warn('Missing Category ID argument');
      throw new Error('Category ID is required');
    }
    const result = await productService.getProductsByCategory(categoryId, limit, nextToken);
    logger.info('Successfully fetched products by category', { categoryId, itemCount: result.items.length, hasNextToken: !!result.nextToken });
    return result;
  } catch (error: any) {
    logger.error('Error processing getProductsByCategory request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

getProductsByCategory.path = __filename;