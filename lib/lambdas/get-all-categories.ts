import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductCategoryService } from '../services/product-category.service';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { ProductRepository } from '../repositories/product.repository';
import * as path from 'path';

export const getAllCategories = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Initialize repositories
    const categoryRepository = new ProductCategoryRepository();
    const productRepository = new ProductRepository();
    
    // Initialize service with dependencies
    const categoryService = new ProductCategoryService(categoryRepository, productRepository);
    
    // Call service method
    const categories = await categoryService.findAllCategories();
    
    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categories),
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
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
getAllCategories.path = __filename; 