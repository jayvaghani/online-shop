import { QueryCommandInput, QueryCommand, BatchGetCommand, BatchGetCommandInput, BatchGetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from './base.repository';
import { Customer } from '../entities/customer.entity';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor(tableName: string = process.env.TABLE_NAME!) {
    super(tableName);
  }

  async createCustomer(customer: Customer): Promise<Customer> {
    return this.putItem(customer);
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    return this.getItem(`CUST#${id}`, `CUST#${id}`);
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
      ExpressionAttributeValues: {
        ':gsi1pk': 'CUST',
        ':gsi1sk': email,
      },
      Limit: 1 
    };
    const customers = await this.query(params);
    return customers.length > 0 ? customers[0] : null;
  }

  async listCustomers(limit?: number, nextToken?: string): Promise<{ items: Customer[]; nextToken: string | null }> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': 'CUST',
      },
      Limit: limit,
      // TODO: Implement proper pagination with ExclusiveStartKey based on nextToken
    };
    const result = await this.client.send(new QueryCommand(params)); 
    const items = (result.Items as Customer[]) || [];
    const lastEvaluatedKey = result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') 
        : null;
    return { items, nextToken: lastEvaluatedKey };
  }

  async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'PK' | 'SK' | 'type'>>): Promise<Customer | null> {
    const PK = `CUST#${id}`;
    const SK = `CUST#${id}`;

    let updateExpression = 'set';
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};
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
      return this.getCustomerById(id); 
    }

    updateExpression += `${first ? 'set' : ','} #updatedAt = :updatedAt`;
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    first = false;
    
    if (updates.email !== undefined) {
      updateExpression += ', #gsi1sk = :gsi1sk';
      expressionAttributeNames['#gsi1sk'] = 'GSI1SK';
      expressionAttributeValues[':gsi1sk'] = updates.email;
    }

    return this.updateItem(PK, SK, updateExpression, expressionAttributeValues, expressionAttributeNames);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const PK = `CUST#${id}`;
    const SK = `CUST#${id}`;
    return this.deleteItem(PK, SK);
  }

  // Merged method to fetch customer names by ID using BatchGetCommand
  async findCustomersNameByIds(customerIds: string[]): Promise<Map<string, { name: string }>> {
    const customerMap = new Map<string, { name: string }>();
    if (customerIds.length === 0) {
      return customerMap;
    }

    
    let idsToRequest = Array.from(new Set(customerIds)).map(id => ({ 
      PK: `CUST#${id}`,
      SK: `CUST#${id}`
    }));
    
    let attempts = 0; 
    const maxAttempts = Number.MAX_SAFE_INTEGER; 

    while (idsToRequest.length > 0 && attempts < maxAttempts) {
      attempts++;
      const batchKeys = idsToRequest.splice(0, 100);
      console.log(`BatchGet attempt ${attempts}: Requesting ${batchKeys.length} customer IDs...`);
      
      // Format keys for this batch
      // const batchKeys = batchIds

      const params: BatchGetCommandInput = {
        RequestItems: {
          [this.tableName]: {
            Keys: batchKeys,
            ProjectionExpression: 'id, #nm', 
            ExpressionAttributeNames: { '#nm': 'name' } 
          }
        }
      };

      try {
        const command = new BatchGetCommand(params);
        const data: BatchGetCommandOutput = await this.client.send(command);

        // Process responses
        if (data.Responses && data.Responses[this.tableName]) {
          data.Responses[this.tableName].forEach(item => {
            if (item && item.id && item.name) { 
              customerMap.set(item.id as string, { name: item.name as string }); 
            } else {
              console.warn('BatchGet: Received unexpected item structure:', item);
            }
          });
        }

        // Check for unprocessed keys from this batch
        if (data.UnprocessedKeys && data.UnprocessedKeys[this.tableName] && data.UnprocessedKeys[this.tableName].Keys) {
          const unprocessedRawKeys = data.UnprocessedKeys[this.tableName].Keys!;
          if (unprocessedRawKeys?.length > 0) {
              idsToRequest.push(...unprocessedRawKeys as { PK: string; SK: string }[]);
              console.warn(`BatchGet: ${unprocessedRawKeys.length} customer IDs were unprocessed in this batch.`);
          }
        }

      } catch (error) {
        console.error(`Error during BatchGetCommand attempt ${attempts}:`, error);
        // If a batch fails, consider all its IDs as unprocessed for retry
        idsToRequest.push(...batchKeys as { PK: string; SK: string }[]);
      }
    } // End while loop

    console.log(`BatchGet: Successfully fetched names for ${customerMap.size} customers.`);
    return customerMap;
  }
} 