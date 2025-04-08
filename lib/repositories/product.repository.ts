import { BaseRepository } from './base.repository';
import { Product } from '../entities/product.entity';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super();
    // Initialize with mock data
    const products = [
      new Product('1', 'Laptop Pro', 'High-performance laptop', 999.99, 2.5, '1', 'https://example.com/laptop.jpg'),
      new Product('2', 'Smartphone X', 'Latest smartphone model', 699.99, 0.2, '1', 'https://example.com/phone.jpg'),
      new Product('3', 'Summer T-Shirt', 'Comfortable cotton t-shirt', 19.99, 0.1, '2', 'https://example.com/tshirt.jpg'),
      new Product('4', 'Jeans', 'Classic blue jeans', 49.99, 0.5, '2', 'https://example.com/jeans.jpg'),
      new Product('5', 'Programming Guide', 'Comprehensive programming book', 29.99, 0.3, '3', 'https://example.com/book.jpg'),
      new Product('6', 'Coffee Maker', 'Automatic coffee maker', 79.99, 1.5, '4', 'https://example.com/coffee.jpg'),
      new Product('7', 'Yoga Mat', 'Non-slip yoga mat', 24.99, 0.4, '5', 'https://example.com/yoga.jpg')
    ];
    products.forEach(product => this.items.set(product.id, product));
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return Array.from(this.items.values()).filter(
      item => item.PK === `CAT#${categoryId}`
    );
  }

  async findByName(name: string): Promise<Product | null> {
    return (await this.findByGSI1('PROD', name))[0] || null;
  }

  async findAllProducts(): Promise<Product[]> {
    return this.findByGSI1('PROD', '');
  }
} 