import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import * as path from 'path';

export const deleteProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract product ID from path parameters
    const productId = event.pathParameters?.id;
    
    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Product ID is required' }),
      };
    }
    
    // Initialize repositories
    const productRepository = new ProductRepository();
    const categoryRepository = new ProductCategoryRepository();
    
    // Initialize service with dependencies
    const productService = new ProductService(productRepository, categoryRepository);
    
    // Call service method
    await productService.deleteProduct(productId);
    
    // Return response
    return {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json',
      },
      body: '',
    };
  } catch (error) {
    console.error('Error deleting product:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Product not found')) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: error.message }),
        };
      }
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

// Add path property to the function
deleteProduct.path = __filename;