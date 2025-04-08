import { BaseService } from './base.service';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { ProductRepository } from '../repositories/product.repository';

export class ProductCategoryService extends BaseService<ProductCategory> {
  private productRepository: ProductRepository;

  constructor(
    repository: ProductCategoryRepository,
    productRepository: ProductRepository
  ) {
    super(repository);
    this.productRepository = productRepository;
  }

  async findByName(name: string): Promise<ProductCategory | null> {
    return (this.repository as ProductCategoryRepository).findByName(name);
  }

  async findAllCategories(): Promise<ProductCategory[]> {
    return (this.repository as ProductCategoryRepository).findAllCategories();
  }

  async getCategoryWithProducts(categoryId: string): Promise<{
    category: ProductCategory | null;
    products: any[];
  }> {
    const category = await this.findById(categoryId);
    if (!category) {
      return { category: null, products: [] };
    }

    const products = await this.productRepository.findByCategory(categoryId);
    return { category, products };
  }

  async createCategory(name: string, description: string): Promise<ProductCategory> {
    // Check if category with the same name already exists
    const existingCategory = await this.findByName(name);
    if (existingCategory) {
      throw new Error(`Category with name '${name}' already exists`);
    }

    // Generate a new ID (in a real app, this would be handled by a proper ID generator)
    const id = Date.now().toString();
    
    const category = new ProductCategory(id, name, description);
    return this.save(category);
  }

  async updateCategory(id: string, name: string, description: string): Promise<ProductCategory> {
    const category = await this.findById(id);
    if (!category) {
      throw new Error(`Category with ID '${id}' not found`);
    }

    // Check if the new name conflicts with an existing category
    if (name !== category.name) {
      const existingCategory = await this.findByName(name);
      if (existingCategory) {
        throw new Error(`Category with name '${name}' already exists`);
      }
    }

    // Create a new category with updated fields
    const updatedCategory = new ProductCategory(id, name, description);
    return this.save(updatedCategory);
  }
} 