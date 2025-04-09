import { QueryCommandInput, BatchWriteCommand, BatchWriteCommandInput, QueryCommand, TransactWriteCommand, TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from './base.repository';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderDetail } from "../entities/order-detail.entity";

export class OrderRepository extends BaseRepository<Order> {
  constructor(tableName: string = process.env.TABLE_NAME!) {
    super(tableName);
  }

  // Creates Order and OrderDetail items transactionally
  async createOrderWithDetails(order: Order, details: OrderDetail[]): Promise<Order> {
    // Map order and details to TransactWriteItem format
    const transactItems: TransactWriteCommandInput['TransactItems'] = [
      {
        Put: {
          TableName: this.tableName,
          Item: order,
          // Optional: Add ConditionExpression to prevent overwriting existing order with same ID
          // ConditionExpression: "attribute_not_exists(PK)", 
        }
      },
      // Add Put operations for each detail item
      ...details.map(detail => ({
        Put: {
          TableName: this.tableName,
          Item: detail,
           // Optional: ConditionExpression to prevent overwriting existing detail
          // ConditionExpression: "attribute_not_exists(PK)",
        }
      }))
    ];

    // Ensure transaction doesn't exceed DynamoDB limits (e.g., 100 items)
    if (transactItems.length > 100) {
        throw new Error("Cannot create order with more than 99 details in a single transaction.");
    }

    const params: TransactWriteCommandInput = {
      TransactItems: transactItems,
    };

    // Use TransactWriteItems for atomicity
    await this.client.send(new TransactWriteCommand(params));
    return order; // Return the main order object upon success
  }

  async getOrderById(customerId: string, orderId: string): Promise<Order | null> {
    // PK=CUST#<customerId>, SK=ORDER#<orderId>
    return this.getItem(`CUST#${customerId}`, `ORDER#${orderId}`);
  }

  async getOrderDetails(orderId: string): Promise<OrderDetail[]> {
     // PK=ORDER#<orderId>, SK starts with DETAIL#
    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `ORDER#${orderId}`,
        ':skPrefix': 'ORDERDETAIL#',
      },
    };
    // Need to cast the result type correctly as BaseRepository returns T (Order)
    const result = await this.client.send(new QueryCommand(params));
    return (result.Items as OrderDetail[]) || [];
  }

  async listOrdersByCustomer(customerId: string, limit?: number, nextToken?: string): Promise<{ items: Order[]; nextToken: string | null }> {
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
        ':pk': `CUST#${customerId}`,
        ':skPrefix': 'ORDER#',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
      ScanIndexForward: false, // Keep existing sort order
    };
    
    const result = await this.client.send(new QueryCommand(params));
    const items = (result.Items as Order[]) || [];
    const newNextToken = result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') 
        : null;
        
    return { items, nextToken: newNextToken };
  }
  
  async listAllOrders(limit?: number, nextToken?: string): Promise<{ items: Order[]; nextToken: string | null }> {
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
      IndexName: 'GSI1', // Using GSI1PK = ORDER
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': 'ORDER',
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
      ScanIndexForward: false, // Keep existing sort order (latest first by date)
    };
    
    const result = await this.client.send(new QueryCommand(params));
    const items = (result.Items as Order[]) || [];
    const newNextToken = result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') 
        : null;
        
    return { items, nextToken: newNextToken };
  }

  async updateOrderStatus(customerId: string, orderId: string, status: OrderStatus): Promise<Order | null> {
    const PK = `CUST#${customerId}`;
    const SK = `ORDER#${orderId}`;
    const updateExpression = 'set #status = :status, #updatedAt = :updatedAt';
    const expressionAttributeNames = { 
        '#status': 'status', 
        '#updatedAt': 'updatedAt' 
    };
    const expressionAttributeValues = { 
        ':status': status,
        ':updatedAt': new Date().toISOString()
     };

    return this.updateItem(PK, SK, updateExpression, expressionAttributeValues, expressionAttributeNames);
  }

  async findOrderById_GSI2(orderId: string): Promise<Order | null> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk AND GSI2SK = :gsi2sk',
      ExpressionAttributeValues: {
        ':gsi2pk': `ORDER#${orderId}`,
        ':gsi2sk': `ORDER#${orderId}` // Or METADATA if GSI2SK is constant
      },
      Limit: 1
    };
    const orders = await this.query(params);
    return orders.length > 0 ? orders[0] : null;
  }

  // deleteOrder might involve deleting details too (complex, consider just cancelling)
} 