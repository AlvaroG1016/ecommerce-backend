
export enum PaymentStatus {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED', 
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  VOIDED = 'VOIDED',
  // Otros estados que Wompi puede devolver
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}


export interface PaymentResult {
  success: boolean;
  providerTransactionId: string;
  reference: string;
  status: PaymentStatus;
  message: string;
  processedAt: Date;

  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaymentRequest {
  transactionId: number;
  amount: number;
  currency: string;
  customerEmail: string;
  cardNumber: string;
  cardCvc: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
  cardBrand: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DINERS';
  // Campos opcionales
  installments?: number;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentService {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  getPaymentStatus(providerTransactionId: string): Promise<PaymentResult>;
  
  // Métodos adicionales útiles
  generateReference?(transactionId: number): string;
  getAcceptanceTokenInfo?(): Promise<any>;
  createCardTokenOnly?(cardData: any): Promise<any>;
}

// Token para inyección de dependencias
export const PAYMENT_SERVICE = Symbol('PaymentService');