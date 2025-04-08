import { BaseRepository } from './base.repository';
import { Customer } from '../entities/customer.entity';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super();
    // Initialize with mock data
    const customers = [
      new Customer('1', 'John', 'Doe', 'johndoe', 'password123', 'john.doe@example.com'),
      new Customer('2', 'Jane', 'Smith', 'janesmith', 'password456', 'jane.smith@example.com'),
      new Customer('3', 'Bob', 'Johnson', 'bobjohnson', 'password789', 'bob.johnson@example.com'),
      new Customer('4', 'Alice', 'Williams', 'alicew', 'password101', 'alice.williams@example.com'),
      new Customer('5', 'Charlie', 'Brown', 'charlieb', 'password202', 'charlie.brown@example.com')
    ];
    customers.forEach(customer => this.items.set(customer.id, customer));
  }

  async findByUsername(username: string): Promise<Customer | null> {
    return (await this.findByGSI1('CUST', username))[0] || null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return (await this.findByGSI2(`EMAIL#${email}`, ''))[0] || null;
  }

  async findAllCustomers(): Promise<Customer[]> {
    return this.findByGSI1('CUST', '');
  }
} 