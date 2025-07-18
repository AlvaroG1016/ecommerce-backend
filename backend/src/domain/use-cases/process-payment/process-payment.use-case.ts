import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../get-products/get-products.use-case';
import { Transaction } from '../../entities/transaction.entity';
import { Product } from '../../entities/product.entity';
import {
  PaymentService,
  PAYMENT_SERVICE,
  PaymentRequest,
  PaymentStatus,
} from '../../services/payment.service.interface';
import {
  TransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../repositories/transaction.repository';
import {
  ProductRepository,
  PRODUCT_REPOSITORY,
} from '../../repositories/product.repository';

// DTOs para el caso de uso
export interface ProcessPaymentRequest {
  transactionId: number;
  cardNumber: string;
  cardCvc: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
}

export interface ProcessPaymentResponse {
  transaction: Transaction;
  product: Product;
  paymentSuccess: boolean;
  message: string;
  requiresPolling?: boolean; 
}


@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(PAYMENT_SERVICE)
    private readonly paymentService: PaymentService,

    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,

    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    request: ProcessPaymentRequest,
  ): Promise<Result<ProcessPaymentResponse>> {
    try {
      console.log('🚀 Starting payment process for transaction:', request.transactionId);

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

      // 3. Validar que se puede procesar
      const canProcessResult = this.validateCanProcess(transaction);
      if (!canProcessResult.isSuccess) {
        return Result.failure(canProcessResult.error!);
      }

      // 4. Obtener producto
      const productResult = await this.getProduct(transaction.productId);
      if (!productResult.isSuccess) {
        return Result.failure(productResult.error!);
      }
      const product = productResult.value!;

      // 5. ✅ NUEVO: Validar tarjeta de prueba antes de procesar
      const cardValidation = this.validateTestCard(request.cardNumber);
      console.log('💳 Card validation result:', cardValidation);

      // 6. Procesar pago con el proveedor externo
      const paymentResult = await this.processPaymentWithProvider(
        transaction,
        request,
      );

      if (!paymentResult.isSuccess) {
        // Marcar transacción como fallida
        const failedTransaction = transaction.markAsFailed();
        await this.transactionRepository.update(transaction.id, failedTransaction);
        return Result.failure(paymentResult.error!);
      }

      const paymentResponse = paymentResult.value!;

     
      console.log('🔍 DETAILED PAYMENT RESPONSE DEBUG:');
      console.log('  Full Response:', JSON.stringify(paymentResponse, null, 2));
      console.log('  Response Type:', typeof paymentResponse);
      console.log('  Has success property:', 'success' in paymentResponse);
      console.log('  Has status property:', 'status' in paymentResponse);
      console.log('  Success value:', paymentResponse.success);
      console.log('  Status value:', paymentResponse.status);

   
      const transactionUpdateResult = await this.updateTransactionWithPaymentResult(
        transaction,
        paymentResponse,
      );

      if (!transactionUpdateResult.isSuccess) {
        return Result.failure(transactionUpdateResult.error!);
      }

      const updatedTransaction = transactionUpdateResult.value!;

      // 8. Actualizar stock SOLO si el pago fue COMPLETAMENTE exitoso
      let updatedProduct = product;
      if (paymentResponse.success && paymentResponse.status === PaymentStatus.APPROVED) {
        const stockResult = await this.updateProductStock(product);
        if (!stockResult.isSuccess) {
          console.error('⚠️ Payment approved but failed to update stock:', stockResult.error?.message);
          // No fallar todo el proceso por esto, solo log
        } else {
          updatedProduct = stockResult.value!;
        }
      }

      
      const responseData = this.buildFinalResponse(
        updatedTransaction,
        updatedProduct,
        paymentResponse
      );

      console.log('🎯 Final response summary:', {
        paymentSuccess: responseData.paymentSuccess,
        paymentStatus: paymentResponse.status,
        transactionStatus: updatedTransaction.status,
        message: responseData.message,
        requiresPolling: responseData.requiresPolling,
      });

      return Result.success(responseData);

    } catch (error) {
      console.error('❌ Process payment use case failed:', error);
      console.error('❌ Error stack:', error.stack);
      return Result.failure(
        new Error(`Failed to process payment: ${error.message}`),
      );
    }
  }

 
  private validateTestCard(cardNumber: string): { isTestCard: boolean; expectedResult: string } {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    const testCards = {
      '4242424242424242': 'APPROVED', // VISA que siempre aprueba
      '4000000000000002': 'DECLINED', // VISA que siempre rechaza
      '5555555555554444': 'APPROVED', // MASTERCARD que siempre aprueba
      '2223003122003222': 'DECLINED', // MASTERCARD que siempre rechaza
    };

    if (testCards[cleanNumber]) {
      return {
        isTestCard: true,
        expectedResult: testCards[cleanNumber]
      };
    }

    return {
      isTestCard: false,
      expectedResult: 'UNKNOWN'
    };
  }


  private buildFinalResponse(
    transaction: Transaction,
    product: Product,
    paymentResponse: any
  ): ProcessPaymentResponse {
    let message: string;
    let paymentSuccess: boolean;
    let requiresPolling: boolean = false;

    // Lógica más clara para determinar el resultado
    if (paymentResponse.success && paymentResponse.status === PaymentStatus.APPROVED) {
      message = 'Payment processed successfully';
      paymentSuccess = true;
    } else {
      paymentSuccess = false;
      
      switch (paymentResponse.status) {
        case PaymentStatus.PENDING:
          message = 'Payment is being processed. Please check again in a few moments.';
          requiresPolling = true; // ✅ NUEVO: Indicar que necesita polling
          break;
        case PaymentStatus.DECLINED:
          message = paymentResponse.message || 'Payment was declined by the bank.';
          break;
        case PaymentStatus.ERROR:
          message = paymentResponse.message || 'Payment processing failed due to an error.';
          break;
        case PaymentStatus.VOIDED:
          message = 'Payment was cancelled.';
          break;
        default:
          message = paymentResponse.message || 'Payment could not be processed.';
          console.warn('⚠️ Unexpected payment status:', paymentResponse.status);
      }
    }

    return {
      transaction,
      product,
      paymentSuccess,
      message,
      requiresPolling,
    };
  }


  private async updateTransactionWithPaymentResult(
    transaction: Transaction,
    paymentResult: any
  ): Promise<Result<Transaction>> {
    try {
      let updatedTransaction: Transaction;

      console.log('🔄 Updating transaction with payment result:', {
        paymentSuccess: paymentResult.success,
        paymentStatus: paymentResult.status,
        providerId: paymentResult.providerTransactionId,
        hasProviderResponse: !!paymentResult,
      });


      if (paymentResult.success === true && paymentResult.status === 'APPROVED') {
        updatedTransaction = transaction.markAsCompleted(
          paymentResult.providerTransactionId,
          paymentResult.reference
        );
        console.log('✅ Transaction marked as COMPLETED');
        
      } else if (paymentResult.status === 'PENDING') {
      
        updatedTransaction = transaction.markAsPending(
          paymentResult.providerTransactionId,
          paymentResult.reference
        );
        console.log('⏳ Transaction updated with provider info but kept as PENDING');
        
      } else {
        // Para DECLINED, ERROR, VOIDED, etc.
        updatedTransaction = transaction.markAsFailed();
        console.log('❌ Transaction marked as FAILED due to status:', paymentResult.status);
      }

      const savedTransaction = await this.transactionRepository.update(
        transaction.id, 
        updatedTransaction
      );

      return Result.success(savedTransaction);

    } catch (error) {
      console.error('❌ Failed to update transaction:', error);
      return Result.failure(new Error(`Failed to update transaction: ${error.message}`));
    }
  }


  private async processPaymentWithProvider(
    transaction: Transaction,
    request: ProcessPaymentRequest,
  ): Promise<Result<any>> {
    try {
      console.log('💳 Processing payment with provider for transaction:', transaction.id);
      console.log('💳 Amount to charge:', transaction.totalAmount);
      
      // Detectar marca de tarjeta
      const cardBrand = request.cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD';
      console.log('💳 Detected card brand:', cardBrand);

      const paymentRequest: PaymentRequest = {
        transactionId: transaction.id,
        amount: transaction.totalAmount,
        currency: 'COP',
        customerEmail: 'customer@example.com',
        cardNumber: request.cardNumber,
        cardCvc: request.cardCvc,
        cardExpMonth: request.cardExpMonth,
        cardExpYear: request.cardExpYear,
        cardHolder: request.cardHolder,
        cardBrand: cardBrand as any,
      };

      console.log('🔄 Sending payment request to adapter...');
      const paymentResult = await this.paymentService.processPayment(paymentRequest);
      
      console.log('📥 Received payment result from adapter:', {
        success: paymentResult.success,
        status: paymentResult.status,
        hasProviderId: !!paymentResult.providerTransactionId,
        message: paymentResult.message,
      });

      return Result.success(paymentResult);
      
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      return Result.failure(
        new Error(`Payment processing failed: ${error.message}`),
      );
    }
  }

  // Métodos privados existentes (sin cambios)...
  private validateRequest(request: ProcessPaymentRequest): Result<void> {
    if (!request.transactionId || request.transactionId <= 0) {
      return Result.failure(new Error('Valid transaction ID is required'));
    }

    if (!request.cardNumber?.trim()) {
      return Result.failure(new Error('Card number is required'));
    }

    if (!request.cardCvc?.trim()) {
      return Result.failure(new Error('Card CVC is required'));
    }

    if (!request.cardExpMonth?.trim()) {
      return Result.failure(new Error('Card expiration month is required'));
    }

    if (!request.cardExpYear?.trim()) {
      return Result.failure(new Error('Card expiration year is required'));
    }

    if (!request.cardHolder?.trim()) {
      return Result.failure(new Error('Card holder name is required'));
    }

    return Result.success(undefined);
  }

  private async getTransaction(transactionId: number): Promise<Result<Transaction>> {
    try {
      const transaction = await this.transactionRepository.findById(transactionId);

      if (!transaction) {
        return Result.failure(new Error(`Transaction ${transactionId} not found`));
      }

      return Result.success(transaction);
    } catch (error) {
      return Result.failure(new Error(`Failed to get transaction: ${error.message}`));
    }
  }

  private validateCanProcess(transaction: Transaction): Result<void> {
    if (!transaction.canBeProcessed()) {
      return Result.failure(
        new Error(`Transaction ${transaction.id} cannot be processed. Status: ${transaction.status}`),
      );
    }

    if (!transaction.isAmountValid()) {
      return Result.failure(
        new Error(`Transaction ${transaction.id} has invalid amount calculation`),
      );
    }

    return Result.success(undefined);
  }

  private async getProduct(productId: number): Promise<Result<Product>> {
    try {
      const product = await this.productRepository.findById(productId);

      if (!product) {
        return Result.failure(new Error(`Product ${productId} not found`));
      }

      if (!product.isAvailable()) {
        return Result.failure(new Error(`Product ${product.name} is not available`));
      }

      return Result.success(product);
    } catch (error) {
      return Result.failure(new Error(`Failed to get product: ${error.message}`));
    }
  }

  private async updateProductStock(product: Product): Promise<Result<Product>> {
    try {
      const updatedProduct = product.reduceStock(1);
      const savedProduct = await this.productRepository.save(updatedProduct);

      console.log(`✅ Stock updated for product ${product.name}: ${product.stock} → ${updatedProduct.stock}`);
      return Result.success(savedProduct);
    } catch (error) {
      return Result.failure(new Error(`Failed to update stock: ${error.message}`));
    }
  }
}