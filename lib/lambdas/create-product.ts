import { AppSyncEvent } from '../types/appsync';
import { Product } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { Logger } from '@aws-lambda-powertools/logger';
import type { Context } from 'aws-lambda';

const productService = new ProductService();
const logger = new Logger({ serviceName: 'createProductLambda' });

// Corresponds to CreateProductInput in schema
interface CreateProductArgs {
  input: {
    name: string;
    description: string;
    price: number;
    weight: number;
    categoryId: string;
    imageUrl: string;
  };
}

export const createProduct = async (
  event: AppSyncEvent<CreateProductArgs>,
  context: Context
): Promise<Product> => {
  logger.addContext(context);
  logger.info('Received request for createProduct', { args: event.arguments });

  try {
    // Pass the raw input object to the service for validation
    const result = await productService.createProduct(event.arguments.input);
    logger.info('Successfully created product', { productId: result.id });
    return result;
  } catch (error: any) {
    logger.error('Error processing createProduct request', { 
        errorName: error.name, 
        errorMessage: error.message, 
        errorStack: error.stack, 
        eventArguments: event.arguments 
    });
    throw error;
  }
};

createProduct.path = __filename; 