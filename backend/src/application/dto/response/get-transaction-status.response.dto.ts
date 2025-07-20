import { Transaction } from "src/domain/entities/transaction.entity";

export interface GetTransactionStatusResponse {
  transaction: Transaction;
  paymentStatus: {
    currentStatus: string;
    providerStatus?: {
      status: string;
      success: boolean;
      message?: string;
      updatedAt: string;
    };
    statusChanged: boolean;
    message: string;
  };
}