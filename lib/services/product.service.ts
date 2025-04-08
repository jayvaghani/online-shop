import { BaseService } from './base.service';
import { Product } from '../entities/product.entity';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';

export class ProductService extends BaseService<Product> {
  private categoryRepository: ProductCategoryRepository;

  constructor(
    repository: ProductRepository,
    categoryRepository: ProductCategoryRepository
  ) {
    super(repository);
    this.categoryRepository = categoryRepository;
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return (this.repository as ProductRepository).findByCategory(categoryId);
  }

  async findByName(name: string): Promise<Product | null> {
    return (this.repository as ProductRepository).findByName(name);
  }

  async findAllProducts(): Promise<Product[]> {
    return (this.repository as ProductRepository).findAllProducts();
  }

  async getProductWithCategory(productId: string): Promise<{
    product: Product | null;
    category: any | null;
  }> {
    const product = await this.findById(productId);
    if (!product) {
      return { product: null, category: null };
    }

    const category = await this.categoryRepository.findById(product.categoryId);
    return { product, category };
  }

  async createProduct(
    name: string,
    description: string,
    price: number,
    weight: number,
    categoryId: string,
    imageUrl: string
  ): Promise<Product> {
    // Check if category exists
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error(`Category with ID '${categoryId}' not found`);
    }

    // Check if product with the same name already exists
    const existingProduct = await this.findByName(name);
    if (existingProduct) {
      throw new Error(`Product with name '${name}' already exists`);
    }

    // Generate a new ID (in a real app, this would be handled by a proper ID generator)
    const id = Date.now().toString();
    
    const product = new Product(id, name, description, price, weight, categoryId, imageUrl);
    return this.save(product);
  }

  async updateProduct(
    id: string,
    name: string,
    description: string,
    price: number,
    weight: number,
    categoryId: string,
    imageUrl: string
  ): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error(`Product with ID '${id}' not found`);
    }

    // Check if category exists
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error(`Category with ID '${categoryId}' not found`);
    }

    // Check if the new name conflicts with an existing product
    if (name !== product.name) {
      const existingProduct = await this.findByName(name);
      if (existingProduct) {
        throw new Error(`Product with name '${name}' already exists`);
      }
    }

    // Create a new product with updated fields
    const updatedProduct = new Product(id, name, description, price, weight, categoryId, imageUrl);
    return this.save(updatedProduct);
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error(`Product with ID '${id}' not found`);
    }
    await this.delete(id);
  }
} 