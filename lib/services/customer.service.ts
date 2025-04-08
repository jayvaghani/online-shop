import { BaseService } from './base.service';
import { Customer } from '../entities/customer.entity';
import { CustomerRepository } from '../repositories/customer.repository';
import { OrderRepository } from '../repositories/order.repository';

export class CustomerService extends BaseService<Customer> {
  private orderRepository: OrderRepository;

  constructor(
    repository: CustomerRepository,
    orderRepository: OrderRepository
  ) {
    super(repository);
    this.orderRepository = orderRepository;
  }

  async findByUsername(username: string): Promise<Customer | null> {
    return (this.repository as CustomerRepository).findByUsername(username);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return (this.repository as CustomerRepository).findByEmail(email);
  }

  async findAllCustomers(): Promise<Customer[]> {
    return (this.repository as CustomerRepository).findAllCustomers();
  }

  async getCustomerWithOrders(customerId: string): Promise<{
    customer: Customer | null;
    orders: any[];
  }> {
    const customer = await this.findById(customerId);
    if (!customer) {
      return { customer: null, orders: [] };
    }

    const orders = await this.orderRepository.findByCustomer(customerId);
    return { customer, orders };
  }

  async createCustomer(
    firstName: string,
    lastName: string,
    username: string,
    password: string,
    emailAddress: string
  ): Promise<Customer> {
    // Check if username already exists
    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
      throw new Error(`Username '${username}' is already taken`);
    }

    // Check if email already exists
    const existingEmail = await this.findByEmail(emailAddress);
    if (existingEmail) {
      throw new Error(`Email '${emailAddress}' is already registered`);
    }

    // Generate a new ID (in a real app, this would be handled by a proper ID generator)
    const id = Date.now().toString();
    
    // In a real app, we would hash the password before storing it
    const customer = new Customer(id, firstName, lastName, username, password, emailAddress);
    return this.save(customer);
  }

  async updateCustomer(
    id: string,
    firstName: string,
    lastName: string,
    username: string,
    emailAddress: string
  ): Promise<Customer> {
    const customer = await this.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID '${id}' not found`);
    }

    // Check if the new username conflicts with an existing customer
    if (username !== customer.username) {
      const existingUsername = await this.findByUsername(username);
      if (existingUsername) {
        throw new Error(`Username '${username}' is already taken`);
      }
    }

    // Check if the new email conflicts with an existing customer
    if (emailAddress !== customer.emailAddress) {
      const existingEmail = await this.findByEmail(emailAddress);
      if (existingEmail) {
        throw new Error(`Email '${emailAddress}' is already registered`);
      }
    }

    // Create a new customer with updated fields, keeping the original password
    const updatedCustomer = new Customer(
      id,
      firstName,
      lastName,
      username,
      customer.password,
      emailAddress
    );
    return this.save(updatedCustomer);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const customer = await this.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID '${id}' not found`);
    }

    // In a real app, we would compare hashed passwords
    if (currentPassword !== customer.password) {
      throw new Error('Current password is incorrect');
    }

    // Create a new customer with the updated password
    const updatedCustomer = new Customer(
      id,
      customer.firstName,
      customer.lastName,
      customer.username,
      newPassword,
      customer.emailAddress
    );
    await this.save(updatedCustomer);
    return true;
  }
} 