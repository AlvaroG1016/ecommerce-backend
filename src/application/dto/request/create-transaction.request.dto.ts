import { CardBrand, PaymentMethod } from "src/domain/entities/transaction.entity";

export interface CreateTransactionRequest {
  // Datos del cliente
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  
  // Datos del producto
  productId: number;
  quantity?: number;
  
  // Datos de pago
  payment: {
    method: PaymentMethod;
    cardLastFour?: string;
    cardBrand?: CardBrand;
  };
  
  // Datos de entrega
  delivery: {
    address: string;
    city: string;
    postalCode?: string;
    phone: string;
  };
}