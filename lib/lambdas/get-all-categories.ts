import { AppSyncEvent } from '../types/appsync';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductCategoryService } from '../services/product-category.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const categoryService = new ProductCategoryService();
const logger = new Logger({ serviceName: 'getAllCategoriesLambda' });

// Define arguments if needed (e.g., for pagination: limit, nextToken)
interface ListCategoriesArgs {
  limit?: number;
  nextToken?: string;
}

// Note: AppSync expects the resolver to return the data structure matching the schema field type.
// For listCategories, this is CategoryConnection, which has { items, nextToken }.
export const getAllCategories = async (
  event: AppSyncEvent<ListCategoriesArgs>,
  context: Context
): Promise<{ items: ProductCategory[]; nextToken: string | null }> => {
  logger.addContext(context);
  logger.info('Received request for getAllCategories', { args: event.arguments });

  try {
    const { limit, nextToken } = event.arguments;
    // Pass arguments to the service layer
    const result = await categoryService.getAllCategories(limit, nextToken);
    logger.info('Successfully fetched categories', { itemCount: result.items.length });
    return result;
  } catch (error: any) {
    logger.error('Error processing getAllCategories request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });

    // Rethrow the error for AppSync to handle
    // AppSync automatically maps thrown errors to GraphQL errors.
    throw error; 
  }
}; 

getAllCategories.path = __filename