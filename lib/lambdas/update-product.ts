import { AppSyncEvent } from '../types/appsync';
import { Product } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const productService = new ProductService();
const logger = new Logger({ serviceName: 'updateProductLambda' });

// Corresponds to UpdateProductInput in schema
interface UpdateProductArgs {
  input: {
    id: string;
    name?: string;
    description?: string;
    price?: number;
    weight?: number;
    categoryId?: string;
    imageUrl?: string;
  };
}

export const updateProduct = async (
  event: AppSyncEvent<UpdateProductArgs>,
  context: Context
): Promise<Product | null> => {
  logger.addContext(context);
  logger.info('Received request for updateProduct', { args: event.arguments });

  try {
    // Pass the raw input object to the service for validation
    const result = await productService.updateProduct(event.arguments.input);
    logger.info('Successfully updated product', { productId: result?.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing updateProduct request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

updateProduct.path = __filename; 