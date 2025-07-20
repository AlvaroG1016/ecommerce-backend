import { Product} from "../../../domain/entities/product.entity";
import { Transaction} from "../../../domain/entities/transaction.entity";

export interface ProcessPaymentResponse {
  transaction: Transaction;
  product: Product;
  paymentSuccess: boolean;
  message: string;
  requiresPolling?: boolean; 
}


export interface ProcessPaymentAppRequest {
  transactionId: number;
  cardNumber: string;
  cardCvc: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
}

// Mantenemos el response del dominio
export type ProcessPaymentAppResponse = ProcessPaymentResponse;