import { Product } from "src/domain/entities/product.entity";
import { GetTransactionStatusResponse } from "../dto/response/get-transaction-status.response.dto";
import { Result } from "src/shared/utils/result.util";
import { ProcessPaymentResponse } from "../dto/response/process-payment.response.dto";
import { ProcessPaymentRequest } from "../dto/request/process-payment.request.dto";
import { UpdateProductStockUseCase } from "../use-cases/update-stock/update-product-stock.use-case";
import { GetTransactionStatusUseCase } from "../use-cases/get-transaction-status/gettransactionstatus.use-case";
import { ProcessPaymentUseCase } from "../use-cases/process-payment/process-payment.use-case";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class PaymentApplicationService {
  private readonly logger = new Logger(PaymentApplicationService.name);

  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly getTransactionStatusUseCase: GetTransactionStatusUseCase,
    private readonly updateProductStockUseCase: UpdateProductStockUseCase,
    // Usar un use case o service existente en lugar de repository directo
    // private readonly updateTransactionUseCase: UpdateTransactionUseCase, // Si existe
    // O si tienes un TransactionService:
    // private readonly transactionService: TransactionService,
  ) {}

  // MÉTODO ORIGINAL - Sin cambios
  async processPayment(request: ProcessPaymentRequest): Promise<{
    success: boolean;
    data?: ProcessPaymentResponse;
    error?: string;
  }> {
    this.logger.log(
      `Application service processing payment for transaction ${request.transactionId}`,
    );

    try {
      const result = await this.processPaymentUseCase.execute(request);

      if (!result.isSuccess) {
        return {
          success: false,
          error: result.error?.message || 'Payment processing failed',
        };
      }

      return {
        success: true,
        data: result.value!,
      };
    } catch (error) {
      this.logger.error(`Application service error: ${error.message}`);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  // NUEVO MÉTODO - Para actualizar con resultado del proveedor externo desde frontend
  async updateTransactionWithProviderResult(
    transactionId: number,
    providerResult: {
      providerTransactionId: string;
      providerStatus: string;
      providerMessage: string;
      providerReference: string;
      providerProcessedAt: Date;
      amountInCents?: number;
      currency?: string;
    }
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    this.logger.log(
      `🔄 Updating transaction ${transactionId} with external provider result from frontend`,
      {
        providerTransactionId: providerResult.providerTransactionId,
        providerStatus: providerResult.providerStatus,
      }
    );

    try {
      // VERSIÓN SIMPLIFICADA: Usar los use cases existentes
      
      // 1. Obtener el estado actual de la transacción
      const statusResult = await this.getTransactionStatusUseCase.execute({ transactionId });
      
      if (!statusResult.isSuccess) {
        return {
          success: false,
          error: `Transaction ${transactionId} not found`,
        };
      }

      const currentTransaction = statusResult.value!.transaction;

      // 2. Simular que la transacción se actualizó externamente
      // En un escenario real, aquí harías la actualización a la base de datos
      // Por ahora, solo loggeamos y manejamos el stock
      
      this.logger.log(`📝 Transaction ${transactionId} would be updated with:`, {
        providerTransactionId: providerResult.providerTransactionId,
        providerStatus: providerResult.providerStatus,
        providerReference: providerResult.providerReference,
      });

      let stockUpdated = false;

      // 3. Si el pago fue aprobado, actualizar el stock
      if (providerResult.providerStatus === 'APPROVED') {
        this.logger.log(`💰 Payment approved for transaction ${transactionId}, updating stock...`);
        
        try {
          const stockUpdateResult = await this.updateProductStockUseCase.execute(transactionId, 1);
          
          if (stockUpdateResult.isSuccess) {
            stockUpdated = true;
            this.logger.log(`✅ Product stock updated successfully for transaction ${transactionId}`);
          } else {
            this.logger.error(
              `⚠️ Failed to update stock for transaction ${transactionId}:`, 
              stockUpdateResult.error?.message
            );
          }
        } catch (stockError) {
          this.logger.error(`⚠️ Stock update error for transaction ${transactionId}:`, stockError.message);
        }
      }

      // 4. Construir respuesta simulada
      const simulatedTransaction = {
        ...currentTransaction,
        providerTransactionId: providerResult.providerTransactionId,
        providerReference: providerResult.providerReference,
        status: providerResult.providerStatus === 'APPROVED' ? 'COMPLETED' : 'FAILED',
        completedAt: providerResult.providerStatus === 'APPROVED' ? providerResult.providerProcessedAt : null,
      };
      
      this.logger.log(`✅ Transaction ${transactionId} processing completed`, {
        newStatus: simulatedTransaction.status,
        stockUpdated,
        providerTransactionId: providerResult.providerTransactionId,
      });

      return {
        success: true,
        data: {
          transaction: simulatedTransaction,
          paymentSuccess: providerResult.providerStatus === 'APPROVED',
          requiresPolling: false,
          stockUpdated,
          providerStatus: providerResult.providerStatus,
        },
      };

    } catch (error) {
      this.logger.error(`❌ Error updating transaction with external provider result: ${error.message}`);
      return {
        success: false,
        error: 'An unexpected error occurred while updating transaction with provider result',
      };
    }
  }

  // MÉTODO ORIGINAL - Sin cambios  
  async getTransactionStatus(transactionId: number): Promise<{
    success: boolean;
    data?: GetTransactionStatusResponse;
    error?: string;
  }> {
    this.logger.log(`Application service getting transaction status for ID: ${transactionId}`);

    try {
      const statusResult = await this.getTransactionStatusUseCase.execute({ transactionId });

      if (!statusResult.isSuccess) {
        return {
          success: false,
          error: statusResult.error?.message || 'Failed to get transaction status',
        };
      }

      const statusResponse = statusResult.value!;

      this.logger.log(`Retrieved transaction status`, {
        transactionId,
        status: statusResponse.transaction.status,
        statusChanged: statusResponse.paymentStatus.statusChanged,
      });

      // update stock if status changed and transaction is completed
      if (this.shouldUpdateStock(statusResponse)) {
        this.logger.log(` Payment completed for transaction ${transactionId}, updating product stock...`);
        
        const stockUpdateResult = await this.handleStockUpdate(transactionId);
        
        if (!stockUpdateResult.isSuccess) {
          this.logger.error(
            `⚠️ Failed to update stock for transaction ${transactionId}:`, 
            stockUpdateResult.error?.message
          );
          this.logger.warn(`⚠️ Stock update failed but payment process continues normally`);
        } else {
          this.logger.log(` Product stock updated successfully for transaction ${transactionId}`);
        }
      }

      return {
        success: true,
        data: statusResponse,
      };

    } catch (error) {
      this.logger.error(`Application service error: ${error.message}`);
      return {
        success: false,
        error: 'An unexpected error occurred while getting transaction status',
      };
    }
  }

  // MÉTODOS PRIVADOS ORIGINALES - Sin cambios
  private shouldUpdateStock(statusResponse: GetTransactionStatusResponse): boolean {
    return statusResponse.paymentStatus.statusChanged && 
           statusResponse.transaction.status === 'COMPLETED';
  }

  private async handleStockUpdate(transactionId: number): Promise<Result<Product>> {
    const stockUpdateResult = await this.updateProductStockUseCase.execute(transactionId, 1);
    return stockUpdateResult;
  }
}