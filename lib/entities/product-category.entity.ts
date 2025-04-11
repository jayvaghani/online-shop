import { BaseEntity } from './base.entity';

export class ProductCategory extends BaseEntity {
  name: string;
  description: string;

  constructor(id: string, name: string, description: string) {
    // PK: CAT#<id> - For direct category access
    // SK: CAT#<id> - Same as PK for direct access
    // GSI1PK: CAT - For listing all categories
    // GSI1SK: <name> - For sorting categories by name
    super(id, `CAT#${id}`, `CAT#${id}`, 'CATEGORY');
    this.name = name;
    this.description = description;
    this.GSI1PK = 'CAT';
    this.GSI1SK = name;
  }
} 