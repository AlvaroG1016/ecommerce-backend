
export enum PaymentStatus {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED', 
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  VOIDED = 'VOIDED',
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
  installments?: number;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentService {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  getPaymentStatus(providerTransactionId: string): Promise<PaymentResult>;
  
  generateReference?(transactionId: number): string;
  getAcceptanceTokenInfo?(): Promise<any>;
  createCardTokenOnly?(cardData: any): Promise<any>;
}

export const PAYMENT_SERVICE = Symbol('PaymentService');