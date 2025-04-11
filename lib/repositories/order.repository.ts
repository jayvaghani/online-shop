import { QueryCommandInput, BatchWriteCommand, BatchWriteCommandInput, QueryCommand, TransactWriteCommand, TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from './base.repository';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderDetail } from "../entities/order-detail.entity";
import { NotFoundError } from "../errors/not-found.error";

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
        ':gsi2sk': `ORDER#${orderId}` // Assumes GSI2SK mirrors GSI2PK for orders
      },
      Limit: 1
    };
    const orders = await this.query(params);
    return orders.length > 0 ? orders[0] : null;
  }

  // New method to delete an order and its details
  async deleteOrderWithDetails(orderId: string): Promise<void> {
      const order = await this.findOrderById_GSI2(orderId);
      if (!order) {
          throw new NotFoundError(`Order with ID ${orderId} not found for deletion.`);
      }
      const customerId = order.customerId;

      const details = await this.getOrderDetails(orderId);

      // Corrected type: Array of WriteRequest objects
      const deleteRequests = [];

      // Add delete request for the main order item
      deleteRequests.push({
          DeleteRequest: {
              Key: {
                  PK: `CUST#${customerId}`,
                  SK: `ORDER#${orderId}`
              }
          }
      });

      // Add delete requests for each detail item
      details.forEach(detail => {
          deleteRequests.push({
              DeleteRequest: {
                  Key: {
                      PK: `ORDER#${orderId}`,
                      SK: `ORDERDETAIL#${detail.id}`
                  }
              }
          });
      });

      const batchSize = 25;
      for (let i = 0; i < deleteRequests.length; i += batchSize) {
          const batch = deleteRequests.slice(i, i + batchSize);
          const params: BatchWriteCommandInput = {
              RequestItems: {
                  [this.tableName]: batch // batch is of type WriteRequest[]
              }
          };
          await this.client.send(new BatchWriteCommand(params));
      }
      console.log(`Successfully deleted order ${orderId} and its ${details.length} details.`);
  }

  // Method to find orders for a specific date using GSI1, projecting only needed fields
  // Modified to support pagination
  async findOrdersByDate(
      targetDate: string,
      limit?: number,
      nextToken?: string
  ): Promise<{ items: Pick<Order,"id" | "customerId" | "orderDate" | "shippingAddress">[]; nextToken: string | null }> {
    let exclusiveStartKey: Record<string, any> | undefined;
    if (nextToken) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'));
      } catch (e) {
        console.error("Error decoding nextToken for findOrdersByDate:", e);
        // Depending on desired behavior, you might throw an error or just start from the beginning
        throw new Error("Invalid pagination token for findOrdersByDate");
      }
    }

    const params: QueryCommandInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :targetDate)',
        ProjectionExpression: 'id, customerId, orderDate, shippingAddress',
        ExpressionAttributeValues: {
            ':gsi1pk': 'ORDER',
            ':targetDate': targetDate
        },
        Limit: limit, // Pass the limit
        ExclusiveStartKey: exclusiveStartKey,
    };
    const command = new QueryCommand(params);
    const data = await this.client.send(command);

    const items = (data.Items as Pick<Order,"id" | "customerId" | "orderDate" | "shippingAddress">[]) || [];
    // Encode the LastEvaluatedKey as the nextToken for the caller
    const newNextToken = data.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64')
        : null;

    return { items, nextToken: newNextToken };
  }
} 