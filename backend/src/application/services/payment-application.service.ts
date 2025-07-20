import { Injectable, Logger } from '@nestjs/common';
import { ProcessPaymentRequest } from '../dto/request/process-payment.request.dto';
import { ProcessPaymentResponse } from '../dto/response/process-payment.response.dto';
import { ProcessPaymentUseCase } from '../use-cases/process-payment/process-payment.use-case';
import { GetTransactionStatusUseCase } from '../use-cases/get-transaction-status/gettransactionstatus.use-case';
import { GetTransactionStatusResponse } from '../dto/response/get-transaction-status.response.dto';
import { UpdateProductStockUseCase } from '../use-cases/update-stock/update-product-stock.use-case';
import { Product } from 'src/domain/entities/product.entity';
import { Result } from 'src/shared/utils/result.util';

@Injectable()
export class PaymentApplicationService {
  private readonly logger = new Logger(PaymentApplicationService.name);

  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly getTransactionStatusUseCase: GetTransactionStatusUseCase,
    private readonly updateProductStockUseCase: UpdateProductStockUseCase,
  ) {}

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

      this.logger.log(`✅ Retrieved transaction status`, {
        transactionId,
        status: statusResponse.transaction.status,
        statusChanged: statusResponse.paymentStatus.statusChanged,
      });

      // update stock if status changed and transaction is completed
      if (this.shouldUpdateStock(statusResponse)) {
        this.logger.log(`🔄 Payment completed for transaction ${transactionId}, updating product stock...`);
        
        const stockUpdateResult = await this.handleStockUpdate(transactionId);
        
        if (!stockUpdateResult.isSuccess) {
          this.logger.error(
            `⚠️ Failed to update stock for transaction ${transactionId}:`, 
            stockUpdateResult.error?.message
          );
          this.logger.warn(`⚠️ Stock update failed but payment process continues normally`);
        } else {
          this.logger.log(`✅ Product stock updated successfully for transaction ${transactionId}`);
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


  private shouldUpdateStock(statusResponse: GetTransactionStatusResponse): boolean {
    return statusResponse.paymentStatus.statusChanged && 
           statusResponse.transaction.status === 'COMPLETED';
  }

 
  private async handleStockUpdate(transactionId: number): Promise<Result<Product>> {
    const stockUpdateResult = await this.updateProductStockUseCase.execute(transactionId, 1);
    
    return stockUpdateResult;
  }
}
