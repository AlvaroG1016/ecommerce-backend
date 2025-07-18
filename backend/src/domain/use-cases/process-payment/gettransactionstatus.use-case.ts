import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../get-products/get-products.use-case';
import { Transaction } from '../../entities/transaction.entity';
import { PaymentService, PAYMENT_SERVICE } from '../../services/payment.service.interface';
import { TransactionRepository, TRANSACTION_REPOSITORY } from '../../repositories/transaction.repository';

// DTOs para el caso de uso
export interface GetTransactionStatusRequest {
  transactionId: number;
}

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

/**
 * CASO DE USO: Consultar estado de una transacción
 * 
 * ¿QUÉ HACE?
 * 1. Obtiene la transacción de la base de datos
 * 2. Si tiene ID del proveedor, consulta el estado actual en Wompi
 * 3. Si el estado cambió, actualiza la transacción en la BD
 * 4. Retorna el estado actual completo
 * 
 * IMPLEMENTA ROP (Railway Oriented Programming)
 */
@Injectable()
export class GetTransactionStatusUseCase {
  constructor(
    @Inject(PAYMENT_SERVICE)
    private readonly paymentService: PaymentService,
    
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(request: GetTransactionStatusRequest): Promise<Result<GetTransactionStatusResponse>> {
    try {
      console.log(`🔍 Getting transaction status for ID: ${request.transactionId}`);

      // 1. Validar entrada
      const validationResult = this.validateRequest(request);
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error!);
      }

      // 2. Obtener transacción
      const transactionResult = await this.getTransaction(request.transactionId);
      if (!transactionResult.isSuccess) {
        return Result.failure(transactionResult.error!);
      }
      const transaction = transactionResult.value!;

      // 3. Consultar estado en el proveedor (si es posible)
      const providerStatusResult = await this.queryProviderStatus(transaction);
      if (!providerStatusResult.isSuccess) {
        // No fallar todo el proceso si no se puede consultar el proveedor
        console.warn(`⚠️ Could not query provider status: ${providerStatusResult.error?.message}`);
      }

      const { updatedTransaction, providerStatus, statusChanged } = providerStatusResult.value || {
        updatedTransaction: transaction,
        providerStatus: null,
        statusChanged: false,
      };

      // 4. Actualizar transacción en BD si cambió
      let finalTransaction = updatedTransaction;
      if (statusChanged) {
        const updateResult = await this.updateTransaction(updatedTransaction);
        if (!updateResult.isSuccess) {
          console.error(`❌ Failed to update transaction: ${updateResult.error?.message}`);
          // No fallar el proceso, usar la transacción sin actualizar
        } else {
          finalTransaction = updateResult.value!;
        }
      }

      // 5. Generar mensaje apropiado
      const message = this.generateStatusMessage(finalTransaction, statusChanged);

      // 6. Respuesta exitosa
      const response: GetTransactionStatusResponse = {
        transaction: finalTransaction,
        paymentStatus: {
          currentStatus: finalTransaction.status,
          providerStatus,
          statusChanged,
          message,
        },
      };

      console.log(`✅ Transaction status retrieved:`, {
        transactionId: finalTransaction.id,
        status: finalTransaction.status,
        hasProviderInfo: !!providerStatus,
        statusChanged,
      });

      return Result.success(response);

    } catch (error) {
      console.error('❌ Get transaction status use case failed:', error.message);
      return Result.failure(
        new Error(`Failed to get transaction status: ${error.message}`)
      );
    }
  }

  // MÉTODOS PRIVADOS (ROP pattern)

  private validateRequest(request: GetTransactionStatusRequest): Result<void> {
    if (!request.transactionId || request.transactionId <= 0) {
      return Result.failure(new Error('Valid transaction ID is required'));
    }

    return Result.success(undefined);
  }

  private async getTransaction(transactionId: number): Promise<Result<Transaction>> {
    try {
      const transaction = await this.transactionRepository.findById(transactionId);
      
      if (!transaction) {
        return Result.failure(new Error(`Transaction ${transactionId} not found`));
      }

      console.log(`📋 Transaction found:`, {
        id: transaction.id,
        status: transaction.status,
        wompiTransactionId: transaction.wompiTransactionId || 'None',
      });

      return Result.success(transaction);

    } catch (error) {
      return Result.failure(new Error(`Failed to get transaction: ${error.message}`));
    }
  }

  private async queryProviderStatus(transaction: Transaction): Promise<Result<{
    updatedTransaction: Transaction;
    providerStatus: any;
    statusChanged: boolean;
  }>> {
    try {
      // Si no hay ID del proveedor, no se puede consultar
      if (!transaction.wompiTransactionId) {
        console.log(`📋 No provider transaction ID available`);
        return Result.success({
          updatedTransaction: transaction,
          providerStatus: null,
          statusChanged: false,
        });
      }

      console.log(`🔗 Querying provider for transaction: ${transaction.wompiTransactionId}`);

      // Consultar estado actual en el proveedor
      const providerResult = await this.paymentService.getPaymentStatus(transaction.wompiTransactionId);

      const providerStatus = {
        status: providerResult.status,
        success: providerResult.success,
        message: providerResult.message,
        updatedAt: new Date().toISOString(),
      };

      console.log(`📊 Provider current status:`, providerStatus);

      const mappedStatus = this.mapWompiStatusToDomain(providerResult.status, providerResult.success);
      
      // Verificar si el estado cambió
      const statusChanged = mappedStatus !== transaction.status;
      let updatedTransaction = transaction;

      if (statusChanged) {
        console.log(`🔄 Status changed from ${transaction.status} to ${mappedStatus} (Wompi: ${providerResult.status})`);
        
        // Actualizar transacción según el nuevo estado
        if (providerResult.success && providerResult.status === 'APPROVED') {
          updatedTransaction = transaction.markAsCompleted(
            providerResult.providerTransactionId,
            providerResult.reference
          );
          console.log(`✅ Transaction will be marked as COMPLETED`);
        } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(providerResult.status)) {
          updatedTransaction = transaction.markAsFailed();
          console.log(`❌ Transaction will be marked as FAILED`);
        }
        // Si es PENDING, mantener el estado actual
      }

      return Result.success({
        updatedTransaction,
        providerStatus,
        statusChanged,
      });

    } catch (error) {
      return Result.failure(new Error(`Failed to query provider status: ${error.message}`));
    }
  }

  private async updateTransaction(transaction: Transaction): Promise<Result<Transaction>> {
    try {
      const savedTransaction = await this.transactionRepository.update(
        transaction.id, 
        transaction
      );

      console.log(`💾 Transaction updated in database:`, {
        id: savedTransaction.id,
        newStatus: savedTransaction.status,
      });

      return Result.success(savedTransaction);

    } catch (error) {
      return Result.failure(new Error(`Failed to update transaction: ${error.message}`));
    }
  }

  private generateStatusMessage(transaction: Transaction, statusChanged: boolean): string {
    let message = '';

    switch (transaction.status) {
      case 'COMPLETED':
        message = statusChanged 
          ? 'Payment has been completed successfully!' 
          : 'Payment completed successfully';
        break;
      case 'PENDING':
        message = 'Payment is still being processed. Please check again in a few moments.';
        break;
      case 'FAILED':
        message = statusChanged 
          ? 'Payment has failed. Please try again.' 
          : 'Payment has failed';
        break;
      default:
        message = `Payment status: ${transaction.status}`;
    }

    return message;
  }

 
  private mapWompiStatusToDomain(wompiStatus: string, success: boolean): string {
    switch (wompiStatus) {
      case 'APPROVED':
        return 'COMPLETED';
      case 'DECLINED':
      case 'ERROR':
      case 'VOIDED':
        return 'FAILED';
      case 'PENDING':
        return 'PENDING';
      default:
        return 'FAILED'; // Por defecto, cualquier estado desconocido se trata como fallido
    }
  }
}