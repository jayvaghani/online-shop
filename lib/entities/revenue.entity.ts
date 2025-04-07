import { BaseEntity } from './base.entity';

export class Revenue extends BaseEntity {
  date: string;
  sum: number;

  constructor(id: string, date: string, sum: number) {
    // PK: REV#<date> - For querying revenues by date
    // SK: REV#<id> - For unique revenue identification
    // GSI1PK: REV - For listing all revenues
    // GSI1SK: <date> - For sorting revenues by date
    // GSI2PK: REV#<id> - For direct revenue access
    // GSI2SK: METADATA - Fixed value for direct access
    super(id, `REV#${date}`, `REV#${id}`, 'REVENUE');
    this.date = date;
    this.sum = sum;
    this.GSI1PK = 'REV';
    this.GSI1SK = date;
    this.GSI2PK = `REV#${id}`;
    this.GSI2SK = 'METADATA';
  }
} 