import { Customer } from '../entities/customer.entity';
import { CustomerRepository } from '../repositories/customer.repository';
import { ValidationError } from '../errors/validation.error';
import { NotFoundError } from '../errors/not-found.error';
import { ConflictError } from '../errors/conflict.error';
import { validateInput, CreateCustomerSchema, UpdateCustomerSchema } from '../validation/schemas';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor(
    customerRepository: CustomerRepository = new CustomerRepository()
  ) {
    this.customerRepository = customerRepository;
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    return this.customerRepository.getCustomerById(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    if (!email) {
        throw new ValidationError('Email is required');
    }
    return this.customerRepository.getCustomerByEmail(email);
  }
  
  async listCustomers(limit?: number, nextToken?: string): Promise<{ items: Customer[]; nextToken: string | null }> {
    return this.customerRepository.listCustomers(limit, nextToken);
  }

  async createCustomer(rawInput: unknown): Promise<Customer> {
    const input = validateInput(CreateCustomerSchema, rawInput);
    const { name, email, address } = input;

    const existingCustomer = await this.customerRepository.getCustomerByEmail(email);
    if (existingCustomer) {
      throw new ConflictError(`Customer with email ${email} already exists.`);
    }

    const newCustomer = new Customer(null, name, email, address);
    return this.customerRepository.createCustomer(newCustomer);
  }

  async updateCustomer(rawInput: unknown): Promise<Customer | null> {
    const input = validateInput(UpdateCustomerSchema, rawInput);
    const { id, email, ...updates } = input;

    const currentCustomer = await this.customerRepository.getCustomerById(id);
    if (!currentCustomer) {
        throw new NotFoundError(`Customer with ID ${id} not found`);
    }

    if (email && email !== currentCustomer.email) {
        const existingByEmail = await this.customerRepository.getCustomerByEmail(email);
        if (existingByEmail && existingByEmail.id !== id) { 
            throw new ConflictError(`Another customer with email ${email} already exists.`);
        }
    }

    const updateData: Partial<Omit<Customer, 'id' | 'PK' | 'SK' | 'type'>> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (email !== undefined) updateData.email = email; 
    if (updates.address !== undefined) updateData.address = updates.address;

    return this.customerRepository.updateCustomer(id, updateData);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customerExists = await this.customerRepository.getCustomerById(id);
    if (!customerExists) {
        return true; // Idempotent
    }
    return this.customerRepository.deleteCustomer(id);
  }
} 