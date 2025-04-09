import { AppSyncEvent } from '../types/appsync';
import { ProductService } from '../services/product.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const productService = new ProductService();
const logger = new Logger({ serviceName: 'deleteProductLambda' });

interface DeleteProductArgs {
  id: string;
}

export const deleteProduct = async (
  event: AppSyncEvent<DeleteProductArgs>,
  context: Context
): Promise<boolean> => {
  logger.addContext(context);
  logger.info('Received request for deleteProduct', { args: event.arguments });

  try {
    const { id } = event.arguments;
    if (!id) {
      logger.warn('Missing Product ID for deletion');
      throw new Error('Product ID is required for deletion');
    }
    const result = await productService.deleteProduct(id);
    logger.info('Successfully deleted product', { productId: id, result });
    return result;
  } catch (error: any) {
    logger.error('Error processing deleteProduct request', { 
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

deleteProduct.path = __filename;