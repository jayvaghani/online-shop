import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand, 
  DeleteCommand,
  PutCommandInput,
  GetCommandInput,
  QueryCommandInput,
  UpdateCommandInput,
  DeleteCommandInput
} from "@aws-sdk/lib-dynamodb";
import { BaseEntity } from '../entities/base.entity';

export abstract class BaseRepository<T extends BaseEntity> {
  protected readonly client: DynamoDBDocumentClient;
  protected readonly tableName: string;

  constructor(tableName: string) {
    const ddbClient = new DynamoDBClient({}); // Configure region if needed
    this.client = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = tableName;
  }

  protected async putItem(item: T): Promise<T> {
    const params: PutCommandInput = {
      TableName: this.tableName,
      Item: item,
    };
    await this.client.send(new PutCommand(params));
    return item;
  }

  protected async getItem(PK: string, SK: string): Promise<T | null> {
    const params: GetCommandInput = {
      TableName: this.tableName,
      Key: { PK, SK },
    };
    const result = await this.client.send(new GetCommand(params));
    return result.Item as T | null;
  }

  protected async query(params: QueryCommandInput): Promise<T[]> {
    const result = await this.client.send(new QueryCommand(params));
    return (result.Items as T[]) || [];
  }
  
  protected async updateItem(PK: string, SK: string, updateExpression: string, expressionAttributeValues: Record<string, any>, expressionAttributeNames?: Record<string, string>): Promise<T | null> {
    const params: UpdateCommandInput = {
        TableName: this.tableName,
        Key: { PK, SK },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: "ALL_NEW" // Or "ALL_NEW" if you need the full item
    };
    const result = await this.client.send(new UpdateCommand(params));
    return result.Attributes as T | null;
}


  protected async deleteItem(PK: string, SK: string): Promise<boolean> {
    const params: DeleteCommandInput = {
      TableName: this.tableName,
      Key: { PK, SK },
    };
    await this.client.send(new DeleteCommand(params));
    return true;
  }
} 