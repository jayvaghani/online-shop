import { BaseEntity } from './base.entity';
import * as uuid from 'uuid';

export class Customer extends BaseEntity {
  name: string;
  email: string;
  address: string; // Simple address string for now

  constructor(
    id: string | null, // Allow null for creation, generate inside
    name: string,
    email: string,
    address: string
  ) {
    const customerId = id || uuid.v4();
    // PK: CUST#<id>
    // SK: CUST#<id> (For direct lookup)
    // GSI1PK: CUST (To list all customers)
    // GSI1SK: email (To lookup/ensure uniqueness by email)
    super(customerId, `CUST#${customerId}`, `CUST#${customerId}`, 'CUSTOMER');
    this.name = name;
    this.email = email;
    this.address = address;
    this.GSI1PK = 'CUST';
    this.GSI1SK = email;
  }
} 