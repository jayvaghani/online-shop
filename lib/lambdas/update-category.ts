import { AppSyncEvent } from '../types/appsync';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductCategoryService } from '../services/product-category.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const categoryService = new ProductCategoryService();
const logger = new Logger({ serviceName: 'updateCategoryLambda' });

interface UpdateCategoryArgs {
  input: {
    id: string;
    name?: string;
    description?: string;
  };
}

export const updateCategory = async (
  event: AppSyncEvent<UpdateCategoryArgs>,
  context: Context
): Promise<ProductCategory | null> => {
  logger.addContext(context);
  logger.info('Received request for updateCategory', { args: event.arguments });

  try {
    const result = await categoryService.updateCategory(event.arguments.input);
    logger.info('Successfully updated category', { categoryId: result?.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing updateCategory request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

updateCategory.path = __filename; 