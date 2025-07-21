import { Injectable, Logger } from '@nestjs/common';
import { CreateTransactionUseCase } from '../use-cases/create-transaction/create-transaction.use-case';
import { CreateTransactionRequest } from '../dto/request/create-transaction.request.dto';
import { CreateTransactionResponse } from '../dto/response/create-transaction.response.dto';


@Injectable()
export class TransactionApplicationService {
  private readonly logger = new Logger(TransactionApplicationService.name);

  constructor(private readonly transactionUseCase: CreateTransactionUseCase) {}

  async createTransaction(request: CreateTransactionRequest): Promise<{
    success: boolean;
    data?: CreateTransactionResponse;
    error?: string;
  }> {
    this.logger.log(
      `Application service processing transaction for customer ${request.customer.name}`,
    );

    try {
      
      const result = await this.transactionUseCase.execute(request);

      if (!result.isSuccess) {
        return {
          success: false,
          error: result.error?.message || 'Transaction processing failed',
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

   

}
