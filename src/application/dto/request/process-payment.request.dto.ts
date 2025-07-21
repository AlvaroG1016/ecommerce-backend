export interface ProcessPaymentRequest {
  transactionId: number;
  cardNumber: string;
  cardCvc: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
  installments?: number;
}
