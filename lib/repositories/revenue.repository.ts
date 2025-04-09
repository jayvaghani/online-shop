import { BaseRepository } from './base.repository';
import { Revenue } from '../entities/revenue.entity';
import { QueryCommandInput, UpdateCommandInput, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as uuid from 'uuid'; // Import uuid

export class RevenueRepository extends BaseRepository<Revenue> {
  constructor(tableName: string = process.env.TABLE_NAME!) {
    super(tableName);
  }

  // Atomically adds to the sum for a given date, creating the item if needed.
  async addRevenueForDate(date: string, amountToAdd: number): Promise<number> {
    // We need a consistent SK for the daily revenue item.
    // Using the date itself or a fixed string like 'TOTAL' is common.
    // Let's use the date for simplicity, making the item unique by PK.
    const revenueId = `DAILY#${date}`; // Consistent ID for the daily summary
    const PK = `REV#${date}`;
    const SK = `REV#${revenueId}`;

    const params: UpdateCommandInput = {
      TableName: this.tableName,
      Key: { PK, SK },
      // Use ADD operation for atomic increment. 
      // Use SET for initial creation attributes if the item doesn't exist.
      UpdateExpression: 
          'SET #gsi1pk = if_not_exists(#gsi1pk, :gsi1pkValue), ' + 
          '#gsi1sk = if_not_exists(#gsi1sk, :gsi1skValue), ' + 
          '#gsi2pk = if_not_exists(#gsi2pk, :gsi2pkValue), ' + 
          '#gsi2sk = if_not_exists(#gsi2sk, :gsi2skValue), ' + 
          '#type = if_not_exists(#type, :typeValue), ' + 
          '#date = if_not_exists(#date, :dateValue), ' + 
          '#createdAt = if_not_exists(#createdAt, :now), ' + 
          '#updatedAt = :now ' + // Always set updatedAt
          'ADD #sum :amount' , // Atomically add the amount
      ExpressionAttributeNames: {
        '#sum': 'sum',
        '#gsi1pk': 'GSI1PK',
        '#gsi1sk': 'GSI1SK',
        '#gsi2pk': 'GSI2PK',
        '#gsi2sk': 'GSI2SK',
        '#type': 'type',
        '#date': 'date',
        '#createdAt': 'createdAt',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':amount': amountToAdd,
        ':gsi1pkValue': 'REV',        // Value for GSI1PK if created
        ':gsi1skValue': date,         // Value for GSI1SK if created
        ':gsi2pkValue': `REV#${revenueId}`, // Value for GSI2PK if created
        ':gsi2skValue': 'METADATA',   // Value for GSI2SK if created
        ':typeValue': 'REVENUE',      // Value for type if created
        ':dateValue': date,         // Value for date if created
        ':now': new Date().toISOString() // Value for createdAt (if new) and updatedAt
      },
      ReturnValues: "UPDATED_NEW" // Returns the new value of the attributes that were updated
    };

    // Use the imported UpdateCommand
    const result = await this.client.send(new UpdateCommand(params));
    // result.Attributes contains the updated values
    return result.Attributes?.sum as number ?? 0;
  }

  // Keep getRevenueByDate as is - it fetches the daily total item
  async getRevenueByDate(date: string): Promise<Revenue | null> {
    const revenueId = `DAILY#${date}`; // Use the same consistent ID
    const PK = `REV#${date}`;
    const SK = `REV#${revenueId}`;
    // Use getItem directly as we know the full key
    return this.getItem(PK, SK); 
  }

  async listRevenueByDateRange(startDate: string, endDate: string): Promise<Revenue[]> {
    // This correctly uses GSI1 to list the daily summary items
    const params: QueryCommandInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':gsi1pk': 'REV',
          ':start': startDate,
          ':end': endDate,
        },
      };
      return this.query(params);
  }

  // Removed createOrUpdateRevenue as addRevenueForDate replaces its functionality
} 