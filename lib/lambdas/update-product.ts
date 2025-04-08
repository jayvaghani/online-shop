import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import * as path from 'path';

export const updateProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { name, description, price, weight, categoryId, imageUrl } = body;
    
    // Validate required fields
    if (!name || !description || !price || !weight || !categoryId || !imageUrl) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'Missing required fields: name, description, price, weight, categoryId, imageUrl' 
        }),
      };
    }
    
    // Initialize repositories
    const productRepository = new ProductRepository();
    const categoryRepository = new ProductCategoryRepository();
    
    // Initialize service with dependencies
    const productService = new ProductService(productRepository, categoryRepository);
    
    // Call service method
    const product = await productService.updateProduct(
      productId,
      name,
      description,
      price,
      weight,
      categoryId,
      imageUrl
    );
    
    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error('Error updating product:', error);
    
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
      if (error.message.includes('Category not found')) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: error.message }),
        };
      }
      if (error.message.includes('Product with this name already exists')) {
        return {
          statusCode: 409,
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
updateProduct.path = __filename; 