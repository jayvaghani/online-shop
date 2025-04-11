import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { Product } from '../entities/product.entity';
import * as uuid from 'uuid';
import { ValidationError } from '../errors/validation.error';
import { NotFoundError } from '../errors/not-found.error';
import { validateInput, CreateProductSchema, UpdateProductSchema } from '../validation/schemas'; // Import validation
// ConflictError might be needed if product names must be unique per category

export class ProductService {
  private productRepository: ProductRepository;
  private categoryRepository: ProductCategoryRepository;

  constructor(
    productRepository: ProductRepository = new ProductRepository(), 
    categoryRepository: ProductCategoryRepository = new ProductCategoryRepository()
  ) {
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.productRepository.getProductById(id);
  }

  async getAllProducts(limit?: number, nextToken?: string): Promise<{ items: Product[]; nextToken: string | null }> {
    return this.productRepository.getAllProducts(limit, nextToken);
  }

  async getProductsByCategory(categoryId: string, limit?: number, nextToken?: string): Promise<{ items: Product[]; nextToken: string | null }> {
    // Maybe check if category exists first?
    // const categoryExists = await this.categoryRepository.getCategoryById(categoryId);
    // if (!categoryExists) throw new NotFoundError(...);
    return this.productRepository.getProductsByCategory(categoryId, limit, nextToken);
  }

  async createProduct(rawInput: unknown): Promise<Product> {
    const input = validateInput(CreateProductSchema, rawInput);
    const { name, description, price, weight, categoryId, imageUrl } = input;
    
    // Business logic check (Category existence)
    const categoryExists = await this.categoryRepository.getCategoryById(categoryId);
    if (!categoryExists) {
      throw new NotFoundError(`Category with ID ${categoryId} not found`);
    }
    // Add check for duplicate product name within category if needed

    const productId = uuid.v4();
    const newProduct = new Product(productId, name, description, price, weight, categoryId, imageUrl);
    return this.productRepository.createProduct(newProduct);
  }

  async updateProduct(rawInput: unknown): Promise<Product | null> {
    const input = validateInput(UpdateProductSchema, rawInput);
    const { id, ...updates } = input; 
    
    const currentProduct = await this.productRepository.getProductById(id);
    if (!currentProduct) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Validations for price/weight already handled by schema if present
    // Add check for duplicate product name within category if name changes
    
    const updateData: Partial<Omit<Product, 'id' | 'PK' | 'SK' | 'type' | 'categoryId'>> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.weight !== undefined) updateData.weight = updates.weight;
    if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl;
    
    // Refinement in schema ensures at least one field present

    return this.productRepository.updateProduct(id, currentProduct.categoryId, updateData);
  }

  async deleteProduct(id: string): Promise<boolean> {
     const productToDelete = await this.productRepository.getProductById(id);
     if (!productToDelete) {
       return true; // Idempotent
     }
     // Add checks for product in active orders if needed
    return this.productRepository.deleteProduct(id, productToDelete.categoryId);
  }
} 