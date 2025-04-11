import { AppSyncEvent } from '../types/appsync';
import { ProductCategoryService } from '../services/product-category.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const categoryService = new ProductCategoryService();
const logger = new Logger({ serviceName: 'deleteCategoryLambda' });

interface DeleteCategoryArgs {
  id: string;
}

export const deleteCategory = async (
  event: AppSyncEvent<DeleteCategoryArgs>,
  context: Context
): Promise<boolean> => {
  logger.addContext(context);
  logger.info('Received request for deleteCategory', { args: event.arguments });

  try {
    const { id } = event.arguments;
    if (!id) {
      logger.warn('Missing Category ID for deletion');
      throw new Error('Category ID is required for deletion');
    }
    const result = await categoryService.deleteCategory(id);
    logger.info('Successfully deleted category', { categoryId: id, result });
    return result;
  } catch (error: any) {
    logger.error('Error processing deleteCategory request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

deleteCategory.path = __filename; 