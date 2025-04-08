import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import * as path from 'path';

export const getProductsByCategory = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract category ID from path parameters
    const categoryId = event.pathParameters?.id;
    
    if (!categoryId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Category ID is required' }),
      };
    }
    
    // Initialize repositories
    const productRepository = new ProductRepository();
    const categoryRepository = new ProductCategoryRepository();
    
    // Initialize service with dependencies
    const productService = new ProductService(productRepository, categoryRepository);
    
    // Call service method
    const products = await productService.findByCategory(categoryId);
    
    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error('Error fetching products by category:', error);
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
getProductsByCategory.path = __filename; 