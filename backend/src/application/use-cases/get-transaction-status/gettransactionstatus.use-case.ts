import { Injectable, Inject } from '@nestjs/common';
import { GetTransactionStatusRequest } from 'src/application/dto/request/get-transaction-status.request.dto';
import { GetTransactionStatusResponse } from 'src/application/dto/response/get-transaction-status.response.dto';
import { Transaction } from 'src/domain/entities/transaction.entity';
import { TRANSACTION_REPOSITORY, TransactionRepository } from 'src/domain/repositories/transaction.repository';
import { PAYMENT_SERVICE, PaymentService } from 'src/domain/services/payment.service.interface';
import { Result } from 'src/shared/utils/result.util';




@Injectable()
export class GetTransactionStatusUseCase {
  constructor(
    @Inject(PAYMENT_SERVICE)
    private readonly paymentService: PaymentService,
    
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(request: GetTransactionStatusRequest): Promise<Result<GetTransactionStatusResponse>> {
    console.log(`🔍 Getting transaction status for ID: ${request.transactionId}`);

    const validationResult = this.validateRequest(request);
    if (!validationResult.isSuccess) {
      return Result.failure(validationResult.error!);
    }

    const transactionResult = await this.getTransaction(request.transactionId);
    if (!transactionResult.isSuccess) {
      return Result.failure(transactionResult.error!);
    }
    const transaction = transactionResult.value!;

    const providerStatusResult = await this.queryProviderStatus(transaction);
    const { updatedTransaction, providerStatus, statusChanged } = providerStatusResult.isSuccess 
      ? providerStatusResult.value!
      : { 
          updatedTransaction: transaction, 
          providerStatus: null, 
          statusChanged: false 
        };

    if (!providerStatusResult.isSuccess) {
      console.warn(`⚠️ Could not query provider status: ${providerStatusResult.error?.message}`);
    }

    let finalTransaction = updatedTransaction;
    if (statusChanged) {
      const updateResult = await this.updateTransaction(updatedTransaction);
      if (!updateResult.isSuccess) {
        console.error(`❌ Failed to update transaction: ${updateResult.error?.message}`);
      } else {
        finalTransaction = updateResult.value!;
      }
    }

    const responseResult = this.buildResponse(finalTransaction, providerStatus, statusChanged);
    if (!responseResult.isSuccess) {
      return Result.failure(responseResult.error!);
    }

    console.log(`✅ Transaction status retrieved:`, {
      transactionId: finalTransaction.id,
      status: finalTransaction.status,
      hasProviderInfo: !!providerStatus,
      statusChanged,
    });

    return Result.success(responseResult.value!);
  }

  private validateRequest(request: GetTransactionStatusRequest): Result<void> {
    if (!request.transactionId || request.transactionId <= 0) {
      return Result.failure(new Error('Valid transaction ID is required'));
    }

    return Result.success(undefined);
  }

  private async getTransaction(transactionId: number): Promise<Result<Transaction>> {
    const findResult = await this.safeAsyncCall(
      () => this.transactionRepository.findById(transactionId),
      'Failed to get transaction'
    );

    if (!findResult.isSuccess) {
      return Result.failure(findResult.error!);
    }

    const transaction = findResult.value;
    if (!transaction) {
      return Result.failure(new Error(`Transaction ${transactionId} not found`));
    }

    console.log(`📋 Transaction found:`, {
      id: transaction.id,
      status: transaction.status,
      wompiTransactionId: transaction.wompiTransactionId || 'None',
    });

    return Result.success(transaction);
  }

  private async queryProviderStatus(transaction: Transaction): Promise<Result<{
    updatedTransaction: Transaction;
    providerStatus: any;
    statusChanged: boolean;
  }>> {
    if (!transaction.wompiTransactionId) {
      console.log(`📋 No provider transaction ID available`);
      return Result.success({
        updatedTransaction: transaction,
        providerStatus: null,
        statusChanged: false,
      });
    }

    console.log(`🔗 Querying provider for transaction: ${transaction.wompiTransactionId}`);

    const providerResult = await this.safeAsyncCall(
      () => this.paymentService.getPaymentStatus(transaction.wompiTransactionId!),
      'Failed to query provider status'
    );

    if (!providerResult.isSuccess) {
      return Result.failure(providerResult.error!);
    }

    const paymentResult = providerResult.value!;

    const providerStatusResult = this.createProviderStatus(paymentResult);
    if (!providerStatusResult.isSuccess) {
      return Result.failure(providerStatusResult.error!);
    }
    const providerStatus = providerStatusResult.value!;

    console.log(`📊 Provider current status:`, providerStatus);

    const mappedStatusResult = this.mapWompiStatusToDomain(paymentResult.status, paymentResult.success);
    if (!mappedStatusResult.isSuccess) {
      return Result.failure(mappedStatusResult.error!);
    }
    const mappedStatus = mappedStatusResult.value!;

    const updateResult = this.updateTransactionIfNeeded(transaction, mappedStatus, paymentResult);
    if (!updateResult.isSuccess) {
      return Result.failure(updateResult.error!);
    }

    return Result.success(updateResult.value!);
  }

  private createProviderStatus(paymentResult: any): Result<any> {
    try {
      return Result.success({
        status: paymentResult.status,
        success: paymentResult.success,
        message: paymentResult.message,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      return Result.failure(new Error(`Failed to create provider status: ${error.message}`));
    }
  }

  private mapWompiStatusToDomain(wompiStatus: string, success: boolean): Result<string> {
    try {
      let mappedStatus: string;

      switch (wompiStatus) {
        case 'APPROVED':
          mappedStatus = 'COMPLETED';
          break;
        case 'DECLINED':
        case 'ERROR':
        case 'VOIDED':
          mappedStatus = 'FAILED';
          break;
        case 'PENDING':
          mappedStatus = 'PENDING';
          break;
        default:
          mappedStatus = 'FAILED'; 
      }

      return Result.success(mappedStatus);
    } catch (error) {
      return Result.failure(new Error(`Failed to map Wompi status: ${error.message}`));
    }
  }

  private updateTransactionIfNeeded(
    transaction: Transaction, 
    mappedStatus: string, 
    paymentResult: any
  ): Result<{
    updatedTransaction: Transaction;
    providerStatus: any;
    statusChanged: boolean;
  }> {
    try {
      const statusChanged = mappedStatus !== transaction.status;
      let updatedTransaction = transaction;

      if (statusChanged) {
        console.log(`🔄 Status changed from ${transaction.status} to ${mappedStatus} (Wompi: ${paymentResult.status})`);
        
        const updateResult = this.createUpdatedTransaction(transaction, paymentResult);
        if (!updateResult.isSuccess) {
          return Result.failure(updateResult.error!);
        }
        updatedTransaction = updateResult.value!;
      }

      const providerStatus = {
        status: paymentResult.status,
        success: paymentResult.success,
        message: paymentResult.message,
        updatedAt: new Date().toISOString(),
      };

      return Result.success({
        updatedTransaction,
        providerStatus,
        statusChanged,
      });
    } catch (error) {
      return Result.failure(new Error(`Failed to update transaction if needed: ${error.message}`));
    }
  }

  private createUpdatedTransaction(transaction: Transaction, paymentResult: any): Result<Transaction> {
    try {
      let updatedTransaction: Transaction;

      if (paymentResult.success && paymentResult.status === 'APPROVED') {
        updatedTransaction = transaction.markAsCompleted(
          paymentResult.providerTransactionId,
          paymentResult.reference
        );
        console.log(`✅ Transaction will be marked as COMPLETED`);
      } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(paymentResult.status)) {
        updatedTransaction = transaction.markAsFailed();
        console.log(`❌ Transaction will be marked as FAILED`);
      } else {
        updatedTransaction = transaction;
      }

      return Result.success(updatedTransaction);
    } catch (error) {
      return Result.failure(new Error(`Failed to create updated transaction: ${error.message}`));
    }
  }

  private async updateTransaction(transaction: Transaction): Promise<Result<Transaction>> {
    return this.safeAsyncCall(
      () => this.transactionRepository.update(transaction.id, transaction),
      'Failed to update transaction'
    );
  }

  private buildResponse(
    transaction: Transaction, 
    providerStatus: any, 
    statusChanged: boolean
  ): Result<GetTransactionStatusResponse> {
    try {
      const message = this.generateStatusMessage(transaction, statusChanged);

      const response: GetTransactionStatusResponse = {
        transaction,
        paymentStatus: {
          currentStatus: transaction.status,
          providerStatus,
          statusChanged,
          message,
        },
      };

      return Result.success(response);
    } catch (error) {
      return Result.failure(new Error(`Failed to build response: ${error.message}`));
    }
  }

  private generateStatusMessage(transaction: Transaction, statusChanged: boolean): string {
    switch (transaction.status) {
      case 'COMPLETED':
        return statusChanged 
          ? 'Payment has been completed successfully!' 
          : 'Payment completed successfully';
      case 'PENDING':
        return 'Payment is still being processed. Please check again in a few moments.';
      case 'FAILED':
        return statusChanged 
          ? 'Payment has failed. Please try again.' 
          : 'Payment has failed';
      default:
        return `Payment status: ${transaction.status}`;
    }
  }

  private async safeAsyncCall<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<Result<T>> {
    try {
      const result = await operation();
      return Result.success(result);
    } catch (error) {
      return Result.failure(new Error(`${errorMessage}: ${error.message}`));
    }
  }
}