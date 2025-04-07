import { BaseEntity } from './base.entity';

export class Order extends BaseEntity {
  customerId: string;
  country: string;
  city: string;
  county: string;
  streetAddress: string;
  totalAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

  constructor(
    id: string,
    customerId: string,
    country: string,
    city: string,
    county: string,
    streetAddress: string,
    totalAmount: number
  ) {
    // PK: CUST#<customerId> - For querying orders by customer
    // SK: ORDER#<id> - For unique order identification
    // GSI1PK: ORDER - For listing all orders
    // GSI1SK: <createdAt> - For sorting orders by date
    // GSI2PK: ORDER#<id> - For direct order access
    // GSI2SK: METADATA - Fixed value for direct access
    super(id, `CUST#${customerId}`, `ORDER#${id}`, 'ORDER');
    this.customerId = customerId;
    this.country = country;
    this.city = city;
    this.county = county;
    this.streetAddress = streetAddress;
    this.totalAmount = totalAmount;
    this.status = 'PENDING';
    this.GSI1PK = 'ORDER';
    this.GSI1SK = this.createdAt;
    this.GSI2PK = `ORDER#${id}`;
    this.GSI2SK = 'METADATA';
  }
} 