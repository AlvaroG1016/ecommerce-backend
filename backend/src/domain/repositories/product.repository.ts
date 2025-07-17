import { Product } from '../entities/product.entity';

// PORT - Interface que define el contrato para el repositorio
export abstract class ProductRepository {
  abstract findAll(): Promise<Product[]>;
  
  abstract findById(id: number): Promise<Product | null>;
  
  abstract findByIdOrFail(id: number): Promise<Product>;
  
  abstract findAvailable(): Promise<Product[]>;
  
  abstract updateStock(id: number, newStock: number): Promise<Product>;
  
  abstract save(product: Product): Promise<Product>;
  
  abstract delete(id: number): Promise<void>;
}

// Símbolo para inyección de dependencias
export const PRODUCT_REPOSITORY = Symbol('ProductRepository');