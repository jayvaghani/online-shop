import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategory } from '../entities/product-category.entity';
import * as uuid from 'uuid';
import { ValidationError } from '../errors/validation.error';
import { NotFoundError } from '../errors/not-found.error';
import { ConflictError } from '../errors/conflict.error';
import { validateInput, CreateCategorySchema, UpdateCategorySchema } from '../validation/schemas';

export class ProductCategoryService {
  private categoryRepository: ProductCategoryRepository;
  private productRepository: ProductRepository;

  constructor(
    categoryRepository: ProductCategoryRepository = new ProductCategoryRepository(),
    productRepository: ProductRepository = new ProductRepository()
  ) {
    this.categoryRepository = categoryRepository;
    this.productRepository = productRepository;
  }

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    return this.categoryRepository.getCategoryById(id);
  }

  async getAllCategories(limit?: number, nextToken?: string): Promise<{ items: ProductCategory[]; nextToken: string | null }> {
    return this.categoryRepository.getAllCategories(limit, nextToken);
  }

  async createCategory(rawInput: unknown): Promise<ProductCategory> {
    const input = validateInput(CreateCategorySchema, rawInput);
    const { name, description } = input;

    if (!name || !description) {
      throw new ValidationError('Missing required category fields: name, description');
    }
    // Optional: Check for existing category name (assumes findByName exists or uses GSI)
    // const existing = await this.categoryRepository.getCategoryByName(name); 
    // if (existing) {
    //   throw new ConflictError(`Category with name "${name}" already exists.`);
    // }

    const categoryId = uuid.v4();
    const newCategory = new ProductCategory(categoryId, name, description);
    return this.categoryRepository.createCategory(newCategory);
  }

  async updateCategory(rawInput: unknown): Promise<ProductCategory | null> {
    const input = validateInput(UpdateCategorySchema, rawInput);
    const { id, ...updates } = input;
    
    const currentCategory = await this.categoryRepository.getCategoryById(id);
    if (!currentCategory) {
        throw new NotFoundError(`Category with ID ${id} not found`);
    }
    
    if (Object.keys(updates).length === 0) {
        return currentCategory; // No changes needed
    }

    // Optional: Check if new name conflicts (assumes findByName exists or uses GSI)
    // if (updates.name && updates.name !== currentCategory.name) {
    //   const existing = await this.categoryRepository.getCategoryByName(updates.name); 
    //   if (existing && existing.id !== id) {
    //     throw new ConflictError(`Category with name "${updates.name}" already exists.`);
    //   }
    // }
    
    const updateData: Partial<Omit<ProductCategory, 'id' | 'PK' | 'SK' | 'type'>> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;

    const updated = await this.categoryRepository.updateCategory(id, updateData);
     if (!updated) {
        throw new Error(`Update failed unexpectedly for Category ID ${id}.`);
    }
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const categoryToDelete = await this.categoryRepository.getCategoryById(id);
    if (!categoryToDelete) {
      return true; // Idempotent
    }

    // Call repository method (no pagination needed, just check existence)
    // Access the 'items' property from the result object
    const productsResult = await this.productRepository.getProductsByCategory(id);
    if (productsResult.items.length > 0) {
      throw new ConflictError(`Cannot delete category "${categoryToDelete.name}" (ID: ${id}) because it contains ${productsResult.items.length} product(s).`);
    }

    return this.categoryRepository.deleteCategory(id);
  }
} 