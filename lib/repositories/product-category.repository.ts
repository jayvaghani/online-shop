import { QueryCommandInput, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from './base.repository';
import { ProductCategory } from '../entities/product-category.entity';

export class ProductCategoryRepository extends BaseRepository<ProductCategory> {
  constructor(tableName: string = process.env.TABLE_NAME!) {
    super(tableName);
  }

  async createCategory(category: ProductCategory): Promise<ProductCategory> {
    return this.putItem(category);
  }

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    // PK=CAT#<id>, SK=CAT#<id>
    return this.getItem(`CAT#${id}`, `CAT#${id}`);
  }

  async getAllCategories(limit?: number, nextToken?: string): Promise<{ items: ProductCategory[]; nextToken: string | null }> {
    let exclusiveStartKey: Record<string, any> | undefined;
    if (nextToken) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'));
      } catch (e) {
        console.error("Error decoding nextToken:", e);
        throw new Error("Invalid pagination token");
      }
    }

    const params: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'GSI1', // Using GSI1PK = CAT
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': 'CAT',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    };
    
    const result = await this.client.send(new QueryCommand(params));
    const items = (result.Items as ProductCategory[]) || [];
    const newNextToken = result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') 
        : null;
        
    return { items, nextToken: newNextToken };
  }

  async updateCategory(id: string, updates: Partial<Omit<ProductCategory, 'id' | 'PK' | 'SK' | 'type'>>): Promise<ProductCategory | null> {
    const PK = `CAT#${id}`;
    const SK = `CAT#${id}`;

    let updateExpression = 'set';
    const expressionAttributeValues: QueryCommandInput['ExpressionAttributeValues'] = {};
    const expressionAttributeNames: QueryCommandInput['ExpressionAttributeNames'] = {};
    let first = true;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (!first) updateExpression += ',';
        const attrValueKey = `:${key}`;
        const attrNameKey = `#${key}`;
        updateExpression += ` ${attrNameKey} = ${attrValueKey}`;
        expressionAttributeValues[attrValueKey] = value;
        expressionAttributeNames[attrNameKey] = key;
        first = false;
      }
    }

    if (Object.keys(expressionAttributeValues).length === 0) {
      return this.getCategoryById(id); // No changes
    }

    // Add updatedAt timestamp
    updateExpression += `${first ? 'set' : ','} #updatedAt = :updatedAt`;
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    first = false; 
    
    // If GSI1SK (name) is updated
    if (updates.name !== undefined) {
        updateExpression += ', #gsi1sk = :gsi1sk';
        expressionAttributeNames['#gsi1sk'] = 'GSI1SK';
        expressionAttributeValues[':gsi1sk'] = updates.name;
    }

    return this.updateItem(PK, SK, updateExpression, expressionAttributeValues, expressionAttributeNames);
  }

  async deleteCategory(id: string): Promise<boolean> {
    // Note: Business logic to check for products is in the service layer.
    const PK = `CAT#${id}`;
    const SK = `CAT#${id}`;
    return this.deleteItem(PK, SK);
  }
}