import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductCategoryService } from '../services/product-category.service';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { ProductRepository } from '../repositories/product.repository';
import * as path from 'path';

export const getCategoryById = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    const categoryRepository = new ProductCategoryRepository();
    const productRepository = new ProductRepository();
    
    // Initialize service with dependencies
    const categoryService = new ProductCategoryService(categoryRepository, productRepository);
    
    // Call service method
    const category = await categoryService.findById(categoryId);
    
    if (!category) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Category not found' }),
      };
    }
    
    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    };
  } catch (error) {
    console.error('Error fetching category:', error);
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
getCategoryById.path = __filename; 