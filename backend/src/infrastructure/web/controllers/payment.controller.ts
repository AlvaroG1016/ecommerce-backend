import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ProcessPaymentUseCase } from '../../../domain/use-cases/process-payment/process-payment.use-case';
import { GetTransactionStatusUseCase } from '../../../domain/use-cases/process-payment/gettransactionstatus.use-case';

// DTOs para validación web
export class ProcessPaymentWebDto {
  cardNumber: string;
  cardCvc: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
}

@Controller('api/payment')
export class PaymentController {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    private readonly getTransactionStatusUseCase: GetTransactionStatusUseCase,
  ) {}

  /**
   * ENDPOINT: Procesar pago de una transacción
   */
  @Post(':id/process-payment')
  async processPayment(
    @Param('id', ParseIntPipe) transactionId: number,
    @Body(ValidationPipe) paymentData: ProcessPaymentWebDto,
  ) {
    console.log(`🎯 Processing payment for transaction ${transactionId}`);

    const result = await this.processPaymentUseCase.execute({
      transactionId,
      cardNumber: paymentData.cardNumber,
      cardCvc: paymentData.cardCvc,
      cardExpMonth: paymentData.cardExpMonth,
      cardExpYear: paymentData.cardExpYear,
      cardHolder: paymentData.cardHolder,
    });

    if (!result.isSuccess) {
      console.error(
        `❌ Payment failed for transaction ${transactionId}:`,
        result.error?.message,
      );

      throw new HttpException(
        {
          error: 'Payment processing failed',
          message: result.error?.message,
          transactionId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const response = result.value!;

    console.log(`✅ Payment processed for transaction ${transactionId}:`, {
      success: response.paymentSuccess,
      status: response.transaction.status,
      productStock: response.product.stock,
    });

    return {
      success: true,
      data: {
        // Datos de la transacción actualizada
        transaction: {
          id: response.transaction.id,
          status: response.transaction.status,
          totalAmount: response.transaction.totalAmount,
          formattedAmount: response.transaction.getFormattedAmount(),
          providerTransactionId: response.transaction.wompiTransactionId,
          providerReference: response.transaction.wompiReference,
          completedAt: response.transaction.completedAt,
        },

        // Datos del producto (con stock actualizado)
        product: {
          id: response.product.id,
          name: response.product.name,
          stock: response.product.stock,
          isAvailable: response.product.isAvailable(),
        },

        // Resultado del pago
        payment: {
          success: response.paymentSuccess,
          message: response.message,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processedAt: response.transaction.completedAt,
        nextStep: response.paymentSuccess ? 'SHOW_SUCCESS' : 'SHOW_ERROR',
      },
    };
  }

  /**
   * ✅ ENDPOINT IMPLEMENTADO: Consultar estado actual de un pago
   * 
   * Permite verificar si un pago PENDING se completó, falló o sigue pendiente
   * Usa arquitectura hexagonal con GetTransactionStatusUseCase
   */
  @Get(':id/payment-status')
  async getPaymentStatus(@Param('id', ParseIntPipe) transactionId: number) {
    console.log(`🔍 Getting payment status for transaction ${transactionId}`);

    const result = await this.getTransactionStatusUseCase.execute({
      transactionId,
    });

    if (!result.isSuccess) {
      console.error(
        `❌ Failed to get payment status for transaction ${transactionId}:`,
        result.error?.message,
      );

      // Determinar el tipo de error HTTP apropiado
      const statusCode = result.error?.message.includes('not found') 
        ? HttpStatus.NOT_FOUND 
        : HttpStatus.INTERNAL_SERVER_ERROR;

      throw new HttpException(
        {
          error: 'Failed to get payment status',
          message: result.error?.message,
          transactionId,
        },
        statusCode,
      );
    }

    const response = result.value!;

    console.log(`✅ Payment status retrieved for transaction ${transactionId}:`, {
      currentStatus: response.paymentStatus.currentStatus,
      statusChanged: response.paymentStatus.statusChanged,
      hasProviderInfo: !!response.paymentStatus.providerStatus,
    });

    // Determinar próximo paso según el estado
    let nextStep = '';
    switch (response.transaction.status) {
      case 'COMPLETED':
        nextStep = 'SHOW_SUCCESS';
        break;
      case 'PENDING':
        nextStep = 'KEEP_CHECKING';
        break;
      case 'FAILED':
        nextStep = 'SHOW_ERROR';
        break;
      default:
        nextStep = 'UNKNOWN';
    }

    return {
      success: true,
      data: {
        // Datos de la transacción
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

        // Estado del pago
        payment: {
          currentStatus: response.paymentStatus.currentStatus,
          message: response.paymentStatus.message,
          statusChanged: response.paymentStatus.statusChanged,
          providerInfo: response.paymentStatus.providerStatus,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        nextStep,
        recommendation: response.transaction.status === 'PENDING' 
          ? 'Check again in 10-30 seconds' 
          : 'No further action needed',
      },
    };
  }
}