import { BaseEntity } from './base.entity';

export class Customer extends BaseEntity {
  firstName: string;
  lastName: string;
  username: string;
  password: string;  // Note: In production, this should be hashed
  emailAddress: string;

  constructor(
    id: string,
    firstName: string,
    lastName: string,
    username: string,
    password: string,
    emailAddress: string
  ) {
    // PK: CUST#<id> - For direct customer access
    // SK: CUST#<id> - Same as PK for direct access
    // GSI1PK: CUST - For listing all customers
    // GSI1SK: <username> - For username-based lookups
    // GSI2PK: EMAIL#<emailAddress> - For email-based lookups
    // GSI2SK: CUST#<id> - For customer identification
    super(id, `CUST#${id}`, `CUST#${id}`, 'CUSTOMER');
    this.firstName = firstName;
    this.lastName = lastName;
    this.username = username;
    this.password = password;
    this.emailAddress = emailAddress;
    this.GSI1PK = 'CUST';
    this.GSI1SK = username;
    this.GSI2PK = `EMAIL#${emailAddress}`;
    this.GSI2SK = `CUST#${id}`;
  }
} 