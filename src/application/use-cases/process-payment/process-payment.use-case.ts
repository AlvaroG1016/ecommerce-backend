import { Injectable, Inject } from '@nestjs/common';
import { ProcessPaymentRequest } from 'src/application/dto/request/process-payment.request.dto';
import { ProcessPaymentResponse } from 'src/application/dto/response/process-payment.response.dto';
import { Product } from 'src/domain/entities/product.entity';
import { Transaction } from 'src/domain/entities/transaction.entity';
import { CUSTOMER_REPOSITORY, CustomerRepository } from 'src/domain/repositories/customer.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/domain/repositories/product.repository';
import { TRANSACTION_REPOSITORY, TransactionRepository } from 'src/domain/repositories/transaction.repository';
import { PAYMENT_SERVICE, PaymentRequest, PaymentService, PaymentStatus } from 'src/domain/services/payment.service.interface';
import { Result } from 'src/shared/utils/result.util';


@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(PAYMENT_SERVICE)
    private readonly paymentService: PaymentService,

    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,

    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,

    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(request: ProcessPaymentRequest): Promise<Result<ProcessPaymentResponse>> {
    console.log('🚀 Starting payment process for transaction:', request.transactionId);

    const validationResult = this.validateRequest(request);
    if (!validationResult.isSuccess) {
      return Result.failure(validationResult.error!);
    }

    const transactionResult = await this.getTransaction(request.transactionId);
    if (!transactionResult.isSuccess) {
      return Result.failure(transactionResult.error!);
    }
    const transaction = transactionResult.value!;

    const canProcessResult = this.validateCanProcess(transaction);
    if (!canProcessResult.isSuccess) {
      return Result.failure(canProcessResult.error!);
    }

    const productResult = await this.getProduct(transaction.productId);
    if (!productResult.isSuccess) {
      return Result.failure(productResult.error!);
    }
    const product = productResult.value!;

    const customerResult = await this.getCustomer(transaction.customerId);
    if (!customerResult.isSuccess) {
      return Result.failure(customerResult.error!);
    }
    const customer = customerResult.value!;

    const cardValidation = this.validateTestCard(request.cardNumber);
    console.log('💳 Card validation result:', cardValidation);
    console.log(" Request params WOMPI:", request,transaction,customer)
    const paymentResult = await this.processPaymentWithProvider(
      transaction, 
      request, 
      customer.email  
    );
    
    if (!paymentResult.isSuccess) {
      const markFailedResult = await this.markTransactionAsFailed(transaction);
      if (!markFailedResult.isSuccess) {
        console.error('⚠️ Failed to mark transaction as failed:', markFailedResult.error?.message);
      }
      return Result.failure(paymentResult.error!);
    }

    const paymentResponse = paymentResult.value!;
  this.logPaymentResult(paymentResponse, transaction.id); 

    const transactionUpdateResult = await this.updateTransactionWithPaymentResult(
      transaction,
      paymentResponse,
    );
    if (!transactionUpdateResult.isSuccess) {
      return Result.failure(transactionUpdateResult.error!);
    }
    const updatedTransaction = transactionUpdateResult.value!;

    let updatedProduct = product;
    if (paymentResponse.success && paymentResponse.status === PaymentStatus.APPROVED) {
      const stockResult = await this.updateProductStock(product);
      if (!stockResult.isSuccess) {
        console.error('⚠️ Payment approved but failed to update stock:', stockResult.error?.message);
      } else {
        updatedProduct = stockResult.value!;
      }
    }

    const responseData = this.buildFinalResponse(
      updatedTransaction,
      updatedProduct,
      paymentResponse
    );

    return Result.success(responseData);
  }

  private async getCustomer(customerId: number): Promise<Result<any>> {
    const findResult = await this.safeAsyncCall(
      () => this.customerRepository.findById(customerId),
      'Failed to get customer'
    );

    if (!findResult.isSuccess) {
      return Result.failure(findResult.error!);
    }

    const customer = findResult.value;
    if (!customer) {
      return Result.failure(new Error(`Customer ${customerId} not found`));
    }

    return Result.success(customer);
  }

  private async processPaymentWithProvider(
    transaction: Transaction,
    request: ProcessPaymentRequest,
    customerEmail: string  
  ): Promise<Result<any>> {
    console.log('💳 Processing payment with provider for transaction:', transaction.id);
    console.log('💳 Amount to charge:', transaction.totalAmount);
    console.log('💳 Customer email:', customerEmail);  
    
    const cardBrand = request.cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD';
    console.log('💳 Detected card brand:', cardBrand);

    const paymentRequest: PaymentRequest = {
      transactionId: transaction.id,
      amount: transaction.totalAmount,
      currency: 'COP',
      customerEmail: customerEmail,  
      cardNumber: request.cardNumber,
      cardCvc: request.cardCvc,
      cardExpMonth: request.cardExpMonth,
      cardExpYear: request.cardExpYear,
      cardHolder: request.cardHolder,
      cardBrand: cardBrand as any,
          installments: request.installments || 1,

    };

    console.log('🔄 Sending payment request to adapter...');
    
    const paymentResult = await this.safeAsyncCall(
      () => this.paymentService.processPayment(paymentRequest),
      'Payment processing failed'
    );

    if (!paymentResult.isSuccess) {
      return Result.failure(paymentResult.error!);
    }

    console.log('📥 Received payment result from adapter:', {
      success: paymentResult.value!.success,
      status: paymentResult.value!.status,
      hasProviderId: !!paymentResult.value!.providerTransactionId,
      message: paymentResult.value!.message,
    });

    return Result.success(paymentResult.value!);
  }

  private logPaymentResult(paymentResponse: any, transactionId: number): void {
    console.log('🔍 DETAILED PAYMENT RESPONSE DEBUG:');
    console.log('  Transaction ID:', transactionId);
    console.log('  Customer Email:', paymentResponse.customerEmail || 'N/A'); 
    console.log('  Full Response:', JSON.stringify(paymentResponse, null, 2));
    console.log('  Success value:', paymentResponse.success);
    console.log('  Status value:', paymentResponse.status);
    console.log('  Provider ID:', paymentResponse.providerTransactionId);
    console.log('  Message:', paymentResponse.message);
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

    if (paymentResponse.success && paymentResponse.status === PaymentStatus.APPROVED) {
      message = 'Payment processed successfully';
      paymentSuccess = true;
    } else {
      paymentSuccess = false;
      
      switch (paymentResponse.status) {
        case PaymentStatus.PENDING:
          message = 'Payment is being processed. Please check again in a few moments.';
          requiresPolling = true;
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
    console.log('🔄 Updating transaction with payment result:', {
      paymentSuccess: paymentResult.success,
      paymentStatus: paymentResult.status,
      providerId: paymentResult.providerTransactionId,
    });

    
    const updatedTransactionResult = this.createUpdatedTransaction(transaction, paymentResult);
    if (!updatedTransactionResult.isSuccess) {
      return Result.failure(updatedTransactionResult.error!);
    }
    const updatedTransaction = updatedTransactionResult.value!;

    
    const saveResult = await this.saveTransaction(updatedTransaction);
    if (!saveResult.isSuccess) {
      return Result.failure(saveResult.error!);
    }

    return Result.success(saveResult.value!);
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

    return Result.success(transaction);
  }

  private async getProduct(productId: number): Promise<Result<Product>> {
    const findResult = await this.safeAsyncCall(
      () => this.productRepository.findById(productId),
      'Failed to get product'
    );

    if (!findResult.isSuccess) {
      return Result.failure(findResult.error!);
    }

    const product = findResult.value;
    if (!product) {
      return Result.failure(new Error(`Product ${productId} not found`));
    }

    if (!product.isAvailable()) {
      return Result.failure(new Error(`Product ${product.name} is not available`));
    }

    return Result.success(product);
  }

  private async updateProductStock(product: Product): Promise<Result<Product>> {
    const updatedProductResult = this.createUpdatedProduct(product);
    if (!updatedProductResult.isSuccess) {
      return Result.failure(updatedProductResult.error!);
    }

    const saveResult = await this.safeAsyncCall(
      () => this.productRepository.save(updatedProductResult.value!),
      'Failed to update stock'
    );

    if (!saveResult.isSuccess) {
      return Result.failure(saveResult.error!);
    }

    console.log(`✅ Stock updated for product ${product.name}: ${product.stock} → ${updatedProductResult.value!.stock}`);
    return Result.success(saveResult.value!);
  }

  
  private createUpdatedTransaction(transaction: Transaction, paymentResult: any): Result<Transaction> {
    try {
      let updatedTransaction: Transaction;

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
        updatedTransaction = transaction.markAsFailed();
        console.log('❌ Transaction marked as FAILED due to status:', paymentResult.status);
      }

      return Result.success(updatedTransaction);
    } catch (error) {
      return Result.failure(new Error(`Failed to create updated transaction: ${error.message}`));
    }
  }

  private createUpdatedProduct(product: Product): Result<Product> {
    try {
      const updatedProduct = product.reduceStock(1);
      return Result.success(updatedProduct);
    } catch (error) {
      return Result.failure(new Error(`Failed to create updated product: ${error.message}`));
    }
  }

  private async markTransactionAsFailed(transaction: Transaction): Promise<Result<Transaction>> {
    const failedTransactionResult = this.createFailedTransaction(transaction);
    if (!failedTransactionResult.isSuccess) {
      return Result.failure(failedTransactionResult.error!);
    }

    return this.saveTransaction(failedTransactionResult.value!);
  }

  private createFailedTransaction(transaction: Transaction): Result<Transaction> {
    try {
      const failedTransaction = transaction.markAsFailed();
      return Result.success(failedTransaction);
    } catch (error) {
      return Result.failure(new Error(`Failed to create failed transaction: ${error.message}`));
    }
  }

  private async saveTransaction(transaction: Transaction): Promise<Result<Transaction>> {
    return this.safeAsyncCall(
      () => this.transactionRepository.update(transaction.id, transaction),
      'Failed to save transaction'
    );
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

  if (request.installments !== undefined) {
    const installments = parseInt(String(request.installments));
    const validInstallments = [1, 3, 6, 9, 12, 18, 24, 36];
    
    if (isNaN(installments) || installments < 1) {
      return Result.failure(new Error('Installments must be a positive number'));
    }
    
    if (!validInstallments.includes(installments)) {
      return Result.failure(new Error(`Invalid installments. Allowed values: ${validInstallments.join(', ')}`));
    }
  }

  return Result.success(undefined);
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
}