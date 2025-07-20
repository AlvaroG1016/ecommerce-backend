import {
  Controller,
  Post,
  Body,
  UseFilters,
  UsePipes,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { CreateTransactionWebDto } from '../dto/create-transaction-web.dto';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { ValidationPipe } from '../pipes/validation.pipe';
import { CreateTransactionUseCase } from 'src/application/use-cases/create-transaction/create-transaction.use-case';
import { ResponseBuilderService } from 'src/application/services/response-builder.service';
import { ApiResponseDto } from 'src/application/dto/response/api-response.dto';
import { TransactionApplicationService } from 'src/application/services/transaction-application.service';

@Controller('api/transactions')
@UseFilters(HttpExceptionFilter)
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionApplicationService,
    private readonly responseBuilder: ResponseBuilderService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  async createTransaction(
    @Body() transactionData: CreateTransactionWebDto,
  ): Promise<ApiResponseDto> {
    debugger;

    try {
      debugger;
      const request = {
        customer: {
          name: transactionData.customer.name,
          email: transactionData.customer.email,
          phone: transactionData.customer.phone,
        },
        productId: transactionData.productId,
        quantity: transactionData.quantity,
        delivery: {
          address: transactionData.delivery.address,
          city: transactionData.delivery.city,
          postalCode: transactionData.delivery.postalCode,
          phone: transactionData.delivery.phone,
        },
        payment: {
          method: transactionData.payment.method,
          cardLastFour: transactionData.payment.cardLastFour,
          cardBrand: transactionData.payment.cardBrand,
        },
      };

      // (ROP - NEVER throws, always returns Result)
      const result = await this.transactionService.createTransaction(request);

      // Handle Result with ResponseBuilder (ROP)
      if (!result.success) {
        return this.responseBuilder.buildError(
          result.error!,
          'Transaction creation failed',
          'TRANSACTION_FAILED',
          {
            nextStep: 'FIX_INPUT',
            recommendation: 'Please check your data and try again',
          },
        );
      }

      return this.responseBuilder.buildSuccessWithEntities(
        result.data!,
        'Transaction created successfully',
        {
          nextStep: 'PROCEED_TO_PAYMENT',
          recommendation: 'You can now proceed to pay for this transaction',
        },
      );
    } catch (error) {
      // ONLY unexpected errors reach here (infrastructure issues, bugs, etc.)
      return this.responseBuilder.buildUnexpectedError(
        error,
        'TransactionController.createTransaction',
      );
    }
  }

 
}
