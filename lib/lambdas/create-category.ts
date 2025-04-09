import { AppSyncEvent } from '../types/appsync';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductCategoryService } from '../services/product-category.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const categoryService = new ProductCategoryService();
const logger = new Logger({ serviceName: 'createCategoryLambda' });

interface CreateCategoryArgs {
  input: {
    name: string;
    description: string;
  };
}

export const createCategory = async (
  event: AppSyncEvent<CreateCategoryArgs>,
  context: Context
): Promise<ProductCategory> => {
  logger.addContext(context);
  logger.info('Received request for createCategory', { args: event.arguments });

  try {
    // Pass the raw input object to the service for validation
    const result = await categoryService.createCategory(event.arguments.input);
    logger.info('Successfully created category', { categoryId: result.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing createCategory request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

createCategory.path = __filename;