import { Customer } from '../entities/customer.entity';

// PORT - Interface que define el contrato para el repositorio de clientes
export abstract class CustomerRepository {
  abstract findAll(): Promise<Customer[]>;
  
  abstract findById(id: number): Promise<Customer | null>;
  
  abstract findByIdOrFail(id: number): Promise<Customer>;
  
  abstract findByEmail(email: string): Promise<Customer | null>;
  
  abstract save(customer: Customer): Promise<Customer>;
  
  abstract delete(id: number): Promise<void>;
  
  abstract exists(email: string): Promise<boolean>;
}

// Símbolo para inyección de dependencias
export const CUSTOMER_REPOSITORY = Symbol('CustomerRepository');