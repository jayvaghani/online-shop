import { BaseRepository } from './base.repository';
import { OrderDetail } from '../entities/order-detail.entity';
import { QueryCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Refactored minimally, assuming details are primarily fetched via OrderRepository
export class OrderDetailRepository extends BaseRepository<OrderDetail> {
  constructor(tableName: string) {
    super(tableName);
    // Removed mock data
  }

  // Method to get details by Order ID (same as in OrderRepository, but here for completeness)
  async findByOrder(orderId: string): Promise<OrderDetail[]> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `ORDER#${orderId}`,
        ':skPrefix': 'DETAIL#',
      },
    };
    const result = await this.client.send(new QueryCommand(params));
    return (result.Items as OrderDetail[]) || [];
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