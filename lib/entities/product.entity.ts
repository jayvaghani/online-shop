import { BaseEntity } from './base.entity';

export class Product extends BaseEntity {
  name: string;
  description: string;
  price: number;
  weight: number;
  categoryId: string;
  imageUrl: string;

  constructor(
    id: string,
    name: string,
    description: string,
    price: number,
    weight: number,
    categoryId: string,
    imageUrl: string
  ) {
    // PK: CAT#<categoryId> - For querying products by category
    // SK: PROD#<id> - For unique product identification
    // GSI1PK: PROD - For listing all products
    // GSI1SK: <name> - For sorting products by name
    // GSI2PK: PROD#<id> - For direct product access
    // GSI2SK: METADATA - Fixed value for direct access
    super(id, `CAT#${categoryId}`, `PROD#${id}`, 'PRODUCT');
    this.name = name;
    this.description = description;
    this.price = price;
    this.weight = weight;
    this.categoryId = categoryId;
    this.imageUrl = imageUrl;
    this.GSI1PK = 'PROD';
    this.GSI1SK = name;
    this.GSI2PK = `PROD#${id}`;
    this.GSI2SK = 'METADATA';
  }
} 