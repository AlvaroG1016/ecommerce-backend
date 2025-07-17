import { Transaction, TransactionStatus } from '../entities/transaction.entity';

// PORT - Interface que define el contrato para el repositorio de transacciones
export abstract class TransactionRepository {
  abstract findAll(): Promise<Transaction[]>;
  
  abstract findById(id: number): Promise<Transaction | null>;
  
  abstract findByIdOrFail(id: number): Promise<Transaction>;
  
  abstract findByCustomerId(customerId: number): Promise<Transaction[]>;
  
  abstract findByStatus(status: TransactionStatus): Promise<Transaction[]>;
  
  abstract findByWompiReference(wompiReference: string): Promise<Transaction | null>;
  
  abstract save(transaction: Transaction): Promise<Transaction>;
  
  abstract update(id: number, transaction: Transaction): Promise<Transaction>;
  
  abstract delete(id: number): Promise<void>;
}

// Símbolo para inyección de dependencias
export const TRANSACTION_REPOSITORY = Symbol('TransactionRepository');