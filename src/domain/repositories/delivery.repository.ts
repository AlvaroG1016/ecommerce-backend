import { Delivery, DeliveryStatus } from '../entities/delivery.entity';

// PORT - Interface para repositorio de entregas
export abstract class DeliveryRepository {
  abstract findAll(): Promise<Delivery[]>;
  
  abstract findById(id: number): Promise<Delivery | null>;
  
  abstract findByIdOrFail(id: number): Promise<Delivery>;
  
  abstract findByTransactionId(transactionId: number): Promise<Delivery | null>;
  
  abstract findByStatus(status: DeliveryStatus): Promise<Delivery[]>;
  
  abstract save(delivery: Delivery): Promise<Delivery>;
  
  abstract update(id: number, delivery: Delivery): Promise<Delivery>;
  
  abstract delete(id: number): Promise<void>;
}

// Símbolo para inyección de dependencias
export const DELIVERY_REPOSITORY = Symbol('DeliveryRepository');