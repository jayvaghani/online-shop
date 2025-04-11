import { BaseRepository } from './base.repository';
import { OrderDetail } from '../entities/order-detail.entity';
import { QueryCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Refactored minimally, assuming details are primarily fetched via OrderRepository
export class OrderDetailRepository extends BaseRepository<OrderDetail> {
  constructor(tableName: string) {
    super(tableName);
    // Removed mock data
  }

  // Renamed existing findByOrder to findDetailsByOrderId and added projection
  async findDetailsByOrderId(orderId: string): Promise<Pick<OrderDetail,"productId" | "productName" | "quantity" | "unitPrice">[]> {
    const details: Pick<OrderDetail,"productId" | "productName" | "quantity" | "unitPrice">[] = [];
    let exclusiveStartKey: Record<string, any> | undefined;

    do {
      const params: QueryCommandInput = {
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          // Project only necessary fields
          ProjectionExpression: 'productId, productName, quantity, unitPrice',
          ExpressionAttributeValues: {
              ':pk': `ORDER#${orderId}`,
              // SK prefix for OrderDetail seems to be ORDERDETAIL# based on entity
              ':skPrefix': 'ORDERDETAIL#', 
          },
          ExclusiveStartKey: exclusiveStartKey,
      };
      const command = new QueryCommand(params);
      const data = await this.client.send(command);
      
      if (data.Items) {
          details.push(...(data.Items as Pick<OrderDetail,"productId" | "productName" | "quantity" | "unitPrice">[]));
      }
      exclusiveStartKey = data.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return details;
  }

  // Method to get details by Product ID (using GSI1 - requires entity to have GSI1 defined)
  async findByProduct(productId: string): Promise<OrderDetail[]> {
    // Need to ensure OrderDetail entity has GSI1PK=`PROD#<productId>` and GSI1SK=`ORDER#<orderId>` defined
    const params: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `PROD#${productId}`,
      },
    };
    const result = await this.client.send(new QueryCommand(params));
    return (result.Items as OrderDetail[]) || [];
  }
} 