import { AppSyncEvent } from '../types/appsync';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductCategoryService } from '../services/product-category.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const categoryService = new ProductCategoryService();
const logger = new Logger({ serviceName: 'getCategoryByIdLambda' });

interface GetCategoryByIdArgs {
  id: string;
}

// For queries returning a single object or null, the resolver should return that object or null directly.
export const getCategoryById = async (
  event: AppSyncEvent<GetCategoryByIdArgs>,
  context: Context
): Promise<ProductCategory | null> => {
  logger.addContext(context);
  logger.info('Received request for getCategoryById', { args: event.arguments });

  try {
    const { id } = event.arguments;
    if (!id) {
      logger.warn('Missing Category ID argument');
      // Input validation should ideally happen before the service call
      throw new Error('Category ID is required'); 
    }
    const result = await categoryService.getCategoryById(id);
    logger.info('Successfully fetched category by ID', { categoryId: id, found: !!result });
    return result;
  } catch (error: any) {
    logger.error('Error processing getCategoryById request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error; // Let AppSync handle error mapping
  }
};

getCategoryById.path = __filename; 