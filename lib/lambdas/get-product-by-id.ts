import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import * as path from 'path';

export const getProductById = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    const result = await productService.getProductWithCategory(productId);
    
    if (!result.product) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }
    
    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching product:', error);
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
getProductById.path = __filename; 