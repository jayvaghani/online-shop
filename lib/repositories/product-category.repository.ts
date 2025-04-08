import { BaseRepository } from './base.repository';
import { ProductCategory } from '../entities/product-category.entity';

export class ProductCategoryRepository extends BaseRepository<ProductCategory> {
  constructor() {
    super();
    // Initialize with mock data
    const categories = [
      new ProductCategory('1', 'Electronics', 'Electronic devices and accessories'),
      new ProductCategory('2', 'Clothing', 'Apparel and fashion items'),
      new ProductCategory('3', 'Books', 'Books and publications'),
      new ProductCategory('4', 'Home & Kitchen', 'Home appliances and kitchenware'),
      new ProductCategory('5', 'Sports', 'Sports equipment and accessories')
    ];
    categories.forEach(category => this.items.set(category.id, category));
  }

  async findByName(name: string): Promise<ProductCategory | null> {
    return (await this.findByGSI1('CAT', name))[0] || null;
  }

  async findAllCategories(): Promise<ProductCategory[]> {
    return this.findByGSI1('CAT', '');
  }
} 