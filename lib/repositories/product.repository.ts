import { QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from './base.repository';
import { Product } from '../entities/product.entity';
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export class ProductRepository extends BaseRepository<Product> {
  constructor(tableName: string = process.env.TABLE_NAME!) {
    super(tableName);
  }

  async createProduct(product: Product): Promise<Product> {
    return this.putItem(product);
  }

  async getProductById(id: string): Promise<Product | null> {
    // Assuming PK=CAT#<categoryId>, SK=PROD#<id> might not be efficient for direct lookup.
    // Using GSI2 for direct product access: GSI2PK=PROD#<id>, GSI2SK=METADATA
    const params: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk AND GSI2SK = :gsi2sk',
      ExpressionAttributeValues: {
        ':gsi2pk': `PROD#${id}`,
        ':gsi2sk': 'METADATA',
      },
    };
    const products = await this.query(params);
    return products.length > 0 ? products[0] : null;
  }

  async getProductsByCategory(categoryId: string, limit?: number, nextToken?: string): Promise<{ items: Product[]; nextToken: string | null }> {
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
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `CAT#${categoryId}`,
        ':skPrefix': 'PROD#',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    };
    
    const result = await this.client.send(new QueryCommand(params));
    const items = (result.Items as Product[]) || [];
    const newNextToken = result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') 
        : null;
        
    return { items, nextToken: newNextToken };
  }
  
  async getAllProducts(limit?: number, nextToken?: string): Promise<{ items: Product[]; nextToken: string | null }> {
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
      IndexName: 'GSI1', // Using GSI1PK = PROD
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': 'PROD',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    };
    
    const result = await this.client.send(new QueryCommand(params));
    const items = (result.Items as Product[]) || [];
    const newNextToken = result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') 
        : null;
        
    return { items, nextToken: newNextToken };
  }

  async updateProduct(id: string, categoryId: string, updates: Partial<Omit<Product, 'id' | 'categoryId' | 'PK' | 'SK' | 'type'>>): Promise<Product | null> {
    // Important: PK and SK are needed for the updateItem call.
    const PK = `CAT#${categoryId}`; 
    const SK = `PROD#${id}`;

    let updateExpression = 'set';
    const expressionAttributeValues: QueryCommandInput['ExpressionAttributeValues'] = {}; // Use Record<string, any> for simplicity
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
      console.warn("UpdateProduct called with no actual changes.");
      return this.getProductById(id); // Return current product if no updates
    }
    
    // Add updatedAt timestamp
    updateExpression += `${first ? 'set' : ','} #updatedAt = :updatedAt`;
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    first = false; // Ensure comma is added if GSI key is next
    
    // If GSI1SK (name) is updated, it needs to be included
    if (updates.name !== undefined) {
      updateExpression += ', #gsi1sk = :gsi1sk'; // Comma is needed here
      expressionAttributeNames['#gsi1sk'] = 'GSI1SK';
      expressionAttributeValues[':gsi1sk'] = updates.name;
    }

    return this.updateItem(PK, SK, updateExpression, expressionAttributeValues, expressionAttributeNames);
  }

  async deleteProduct(id: string, categoryId: string): Promise<boolean> {
    const PK = `CAT#${categoryId}`;
    const SK = `PROD#${id}`;
    return this.deleteItem(PK, SK);
  }
}