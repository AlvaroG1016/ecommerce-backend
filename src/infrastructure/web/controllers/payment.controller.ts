import {
  Controller,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseFilters,
  UsePipes,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';

import { ProcessPaymentWebDto } from '../dto/process-payment-web.dto';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { ValidationPipe } from '../pipes/validation.pipe';
import { PaymentApplicationService } from 'src/application/services/payment-application.service';
import { ResponseBuilderService } from 'src/application/services/response-builder.service';
import { ApiResponseDto } from 'src/application/dto/response/api-response.dto';
import { UpdateTransactionWithProviderResultDto } from '../dto/UpdateTransactionWithProviderResultDto';

@Controller('api/payment')
@UseFilters(HttpExceptionFilter)
export class PaymentController {
  constructor(
    private readonly paymentApplicationService: PaymentApplicationService,
    private readonly responseBuilder: ResponseBuilderService,
  ) {}

  @Post(':id/process-payment')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  async processPayment(
    @Param('id', ParseIntPipe) transactionId: number,
    @Body() paymentData: ProcessPaymentWebDto,
  ): Promise<ApiResponseDto> {
    try {
      const request = {
        transactionId,
        cardNumber: paymentData.cardNumber,
        cardCvc: paymentData.cardCvc,
        cardExpMonth: paymentData.cardExpMonth,
        cardExpYear: paymentData.cardExpYear,
        cardHolder: paymentData.cardHolder,
        installments: paymentData.installments || 1,

      };
      debugger
      const result =
        await this.paymentApplicationService.processPayment(request);

      if (!result.success) {
        return this.responseBuilder.buildError(
          result.error!,
          `Payment processing for transaction ${transactionId}`,
          'PAYMENT_FAILED',
          {
            nextStep: 'RETRY_PAYMENT',
            recommendation: 'Please check your card details and try again',
          },
        );
      }

      return this.responseBuilder.buildSuccessWithEntities(
        result.data!,
        `Payment processed successfully for transaction ${transactionId}`,
        this.getPaymentMetadata(result.data!),
      );
    } catch (error) {
      return this.responseBuilder.buildUnexpectedError(
        error,
        'PaymentController.processPayment',
        { transactionId },
      );
    }
  }

 @Post(':id/update-with-provider-result')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  async updateTransactionWithProviderResult(
    @Param('id', ParseIntPipe) transactionId: number,
    @Body() providerResult: UpdateTransactionWithProviderResultDto,
  ): Promise<ApiResponseDto> {
    try {
      console.log(`📥 Updating transaction ${transactionId} with external provider result from frontend`);
      
      const result = await this.paymentApplicationService.updateTransactionWithProviderResult(
        transactionId,
        {
          providerTransactionId: providerResult.providerTransactionId,
          providerStatus: providerResult.providerStatus,
          providerMessage: providerResult.providerMessage,
          providerReference: providerResult.providerReference,
          providerProcessedAt: new Date(providerResult.providerProcessedAt),
          amountInCents: providerResult.amountInCents,
          currency: providerResult.currency,
        }
      );

      if (!result.success) {
        return this.responseBuilder.buildError(
          result.error!,
          `Failed to update transaction ${transactionId} with provider result`,
          'TRANSACTION_UPDATE_FAILED',
          {
            nextStep: 'CHECK_TRANSACTION_STATUS',
            recommendation: 'Payment may have been processed. Check transaction status.',
          },
        );
      }

      return this.responseBuilder.buildSuccessWithEntities(
        result.data!,
        `Transaction ${transactionId} updated successfully with provider result`,
        {
          nextStep: result.data!.paymentSuccess ? 'SHOW_SUCCESS' : 'SHOW_ERROR',
          recommendation: result.data!.paymentSuccess 
            ? 'Payment completed successfully'
            : 'Payment was not successful',
          externallyProcessed: true,
          stockUpdated: result.data!.stockUpdated || false,
        },
      );
    } catch (error) {
      return this.responseBuilder.buildUnexpectedError(
        error,
        'PaymentController.updateTransactionWithProviderResult',
        { transactionId },
      );
    }
  }

  @Get(':id/status')
  @HttpCode(HttpStatus.OK)
  async getTransactionStatus(
    @Param('id', ParseIntPipe) transactionId: number,
  ): Promise<ApiResponseDto> {
    try {
      const result =
        await this.paymentApplicationService.getTransactionStatus(
          transactionId,
        );

      if (!result.success) {
        const isNotFound = result.error!.includes('not found');

        return this.responseBuilder.buildError(
          result.error!,
          `Transaction status retrieval failed for ID ${transactionId}`,
          isNotFound ? 'TRANSACTION_NOT_FOUND' : 'STATUS_RETRIEVAL_FAILED',
          {
            nextStep: isNotFound ? 'CHECK_TRANSACTION_ID' : 'RETRY_REQUEST',
            recommendation: isNotFound
              ? 'Please verify the transaction ID and try again'
              : 'Please try again in a few moments',
          },
        );
      }

      const response = result.data!;
      const responseData = {
        transaction: {
          id: response.transaction.id,
          status: response.transaction.status,
          totalAmount: response.transaction.totalAmount,
          formattedAmount: response.transaction.getFormattedAmount(),
          providerTransactionId: response.transaction.wompiTransactionId,
          providerReference: response.transaction.wompiReference,
          createdAt: response.transaction.createdAt,
          completedAt: response.transaction.completedAt,
        },
        paymentStatus: {
          currentStatus: response.paymentStatus.currentStatus,
          message: response.paymentStatus.message,
          statusChanged: response.paymentStatus.statusChanged,
          providerInfo: response.paymentStatus.providerStatus,
        },
      };

      const metadata = this.buildStatusMetadata(response);

      return this.responseBuilder.buildSuccess(
        responseData,
        `Transaction status retrieved successfully for ID ${transactionId}`,
        metadata,
      );
    } catch (error) {
      return this.responseBuilder.buildUnexpectedError(
        error,
        'TransactionStatusController.getTransactionStatus',
        { transactionId },
      );
    }
  }
  private buildStatusMetadata(response: any) {
    const baseMetadata = {
      statusChanged: response.paymentStatus.statusChanged,
      hasProviderInfo: !!response.paymentStatus.providerInfo,
    };

    switch (response.transaction.status) {
      case 'COMPLETED':
        return {
          ...baseMetadata,
          nextStep: 'SHOW_SUCCESS',
          recommendation: 'Transaction completed successfully',
        };
      case 'PENDING':
        return {
          ...baseMetadata,
          nextStep: 'KEEP_CHECKING',
          recommendation: 'Check again in 10-30 seconds',
        };
      case 'FAILED':
        return {
          ...baseMetadata,
          nextStep: 'SHOW_ERROR',
          recommendation: 'Transaction failed - contact support if needed',
        };
      default:
        return {
          ...baseMetadata,
          nextStep: 'CHECK_STATUS',
          recommendation: 'Unknown status - please contact support',
        };
    }
  }

  private getPaymentMetadata(response: any) {
    if (response.paymentSuccess) {
      return {
        nextStep: 'SHOW_SUCCESS',
        recommendation: 'Payment completed successfully',
        processedAt: response.transaction.completedAt,
      };
    } else if (response.requiresPolling) {
      return {
        nextStep: 'KEEP_CHECKING',
        recommendation: 'Check payment status in 10-30 seconds',
      };
    } else {
      return {
        nextStep: 'SHOW_ERROR',
        recommendation: 'Payment failed - please try again',
      };
    }
  }
}
