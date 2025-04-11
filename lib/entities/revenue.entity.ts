import { BaseEntity } from './base.entity';
import * as uuid from 'uuid'; // Import uuid

export class Revenue extends BaseEntity {
  date: string;
  sum: number;

  constructor(
    id: string | null, // Allow null for id
    date: string,
    sum: number
  ) {
    const revenueId = id || uuid.v4(); // Generate UUID if id is null
    // PK: REV#<date> - For querying revenues by date
    // SK: REV#<revenueId> - Use the generated UUID in the SK
    // GSI1PK: REV - For listing all revenues
    // GSI1SK: <date> - For sorting revenues by date
    // GSI2PK: REV#<revenueId> - For direct revenue access
    // GSI2SK: METADATA - Fixed value for direct access
    super(revenueId, `REV#${date}`, `REV#${revenueId}`, 'REVENUE');
    this.date = date;
    this.sum = sum;
    this.GSI1PK = 'REV';
    this.GSI1SK = date;
    this.GSI2PK = `REV#${revenueId}`;
    this.GSI2SK = 'METADATA';
  }
} 