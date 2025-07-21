import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { Customer } from '../../../domain/entities/customer.entity';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Customer[]> {
    const customers = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return customers.map(this.toDomain);
  }

  async findById(id: number): Promise<Customer | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    return customer ? this.toDomain(customer) : null;
  }

  async findByIdOrFail(id: number): Promise<Customer> {
    const customer = await this.findById(id);
    
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    return customer ? this.toDomain(customer) : null;
  }

  async save(customer: Customer): Promise<Customer> {
    const data = this.toPersistence(customer);

    let savedCustomer;
    
    if (customer.id === 0) {
      const { id, ...createData } = data;
      savedCustomer = await this.prisma.customer.create({
        data: createData,
      });
    } else {
      savedCustomer = await this.prisma.customer.update({
        where: { id: customer.id },
        data,
      });
    }

    return this.toDomain(savedCustomer);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.customer.delete({
      where: { id },
    });
  }

  async exists(email: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    return !!customer;
  }

  
  private toDomain(prismaCustomer: any): Customer {
    return Customer.fromPersistence({
      id: prismaCustomer.id,
      name: prismaCustomer.name,
      email: prismaCustomer.email,
      phone: prismaCustomer.phone || '',
      createdAt: prismaCustomer.createdAt,
    });
  }

  private toPersistence(customer: Customer) {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
    };
  }
}