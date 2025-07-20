import { Injectable, Inject } from '@nestjs/common';
import { Transaction } from '../../../domain/entities/transaction.entity';
import { Customer } from '../../../domain/entities/customer.entity';
import { Product } from '../../../domain/entities/product.entity';
import { Delivery } from '../../../domain/entities/delivery.entity';
import { TransactionRepository, TRANSACTION_REPOSITORY } from '../../../domain/repositories/transaction.repository';
import { CustomerRepository, CUSTOMER_REPOSITORY } from '../../../domain/repositories/customer.repository';
import { ProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository';
import { DeliveryRepository, DELIVERY_REPOSITORY } from '../../../domain/repositories/delivery.repository';
import { CreateTransactionRequest } from 'src/application/dto/request/create-transaction.request.dto';
import { CreateTransactionResponse } from 'src/application/dto/response/create-transaction.response.dto';
import { Result } from 'src/shared/utils/result.util';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
    
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: CustomerRepository,
    
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveryRepository: DeliveryRepository,
  ) {}

  async execute(request: CreateTransactionRequest): Promise<Result<CreateTransactionResponse>> {
    
    const validationResult = this.validateRequest(request);
    if (!validationResult.isSuccess) {
      return Result.failure(validationResult.error!);
    }

    
    const customerResult = await this.getOrCreateCustomer(request.customer);
    if (!customerResult.isSuccess) {
      return Result.failure(customerResult.error!);
    }
    const customer = customerResult.value!;

    
    const productResult = await this.validateProduct(request.productId, request.quantity || 1);
    if (!productResult.isSuccess) {
      return Result.failure(productResult.error!);
    }
    const product = productResult.value!;

    
    const deliveryResult = this.createDelivery(request.delivery);
    if (!deliveryResult.isSuccess) {
      return Result.failure(deliveryResult.error!);
    }
    const deliveryData = deliveryResult.value!;

    
    const quantity = request.quantity || 1;
    const productAmount = product.price * quantity;
    const baseFee = product.baseFee;
    const deliveryFee = deliveryData.deliveryFee;

   
    const transactionResult = this.createTransaction({
      customerId: customer.id,
      productId: product.id,
      productAmount,
      baseFee,
      deliveryFee,
      paymentMethod: request.payment.method,
      cardLastFour: request.payment.cardLastFour,
      cardBrand: request.payment.cardBrand,
    });

    if (!transactionResult.isSuccess) {
      return Result.failure(transactionResult.error!);
    }
    const transaction = transactionResult.value!;

   
    const savedTransactionResult = await this.saveTransaction(transaction);
    if (!savedTransactionResult.isSuccess) {
      return Result.failure(savedTransactionResult.error!);
    }
    const savedTransaction = savedTransactionResult.value!;


    const deliveryWithTransactionResult = this.createDeliveryWithTransaction(
      deliveryData, 
      savedTransaction.id
    );
    if (!deliveryWithTransactionResult.isSuccess) {
      return Result.failure(deliveryWithTransactionResult.error!);
    }


    const savedDeliveryResult = await this.saveDelivery(deliveryWithTransactionResult.value!);
    if (!savedDeliveryResult.isSuccess) {
      return Result.failure(savedDeliveryResult.error!);
    }
    const savedDelivery = savedDeliveryResult.value!;

    
    const response: CreateTransactionResponse = {
      transaction: savedTransaction,
      customer,
      product,
      delivery: savedDelivery,
    };

    return Result.success(response);
  }

  // ✅ Todos los métodos privados también usan ROP
  private validateRequest(request: CreateTransactionRequest): Result<void> {
    if (!request.customer.name?.trim()) {
      return Result.failure(new Error('Customer name is required'));
    }

    if (!request.customer.email?.trim()) {
      return Result.failure(new Error('Customer email is required'));
    }

    if (!request.customer.phone?.trim()) {
      return Result.failure(new Error('Customer phone is required'));
    }

    if (!request.productId || request.productId <= 0) {
      return Result.failure(new Error('Valid product ID is required'));
    }

    if (request.quantity && request.quantity <= 0) {
      return Result.failure(new Error('Quantity must be greater than 0'));
    }

    if (!request.delivery.address?.trim()) {
      return Result.failure(new Error('Delivery address is required'));
    }

    if (!request.delivery.city?.trim()) {
      return Result.failure(new Error('Delivery city is required'));
    }

    if (!request.delivery.phone?.trim()) {
      return Result.failure(new Error('Delivery phone is required'));
    }

    return Result.success(undefined);
  }

  private async getOrCreateCustomer(customerData: CreateTransactionRequest['customer']): Promise<Result<Customer>> {
    // ✅ Wrap database calls in Result
    const findResult = await this.safeAsyncCall(
      () => this.customerRepository.findByEmail(customerData.email),
      'Failed to find customer by email'
    );

    if (!findResult.isSuccess) {
      return Result.failure(findResult.error!);
    }

    const existingCustomer = findResult.value;
    if (existingCustomer) {
      return Result.success(existingCustomer);
    }

    // Create new customer
    const createCustomerResult = this.createCustomer(customerData);
    if (!createCustomerResult.isSuccess) {
      return Result.failure(createCustomerResult.error!);
    }

    const saveResult = await this.safeAsyncCall(
      () => this.customerRepository.save(createCustomerResult.value!),
      'Failed to save customer'
    );

    return saveResult;
  }

  private async validateProduct(productId: number, quantity: number): Promise<Result<Product>> {
    const findResult = await this.safeAsyncCall(
      () => this.productRepository.findById(productId),
      'Failed to find product'
    );

    if (!findResult.isSuccess) {
      return Result.failure(findResult.error!);
    }

    const product = findResult.value;
    if (!product) {
      return Result.failure(new Error(`Product with ID ${productId} not found`));
    }

    if (!product.isAvailable()) {
      return Result.failure(new Error(`Product ${product.name} is not available`));
    }

    if (!product.canFulfillQuantity(quantity)) {
      return Result.failure(new Error(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`));
    }

    return Result.success(product);
  }

  private createDelivery(deliveryData: CreateTransactionRequest['delivery']): Result<Delivery> {
    try {
      const delivery = Delivery.create({
        transactionId: 0, // Will be assigned later
        address: deliveryData.address,
        city: deliveryData.city,
        postalCode: deliveryData.postalCode,
        phone: deliveryData.phone,
      });

      return Result.success(delivery);
    } catch (error) {
      return Result.failure(new Error(`Failed to create delivery: ${error.message}`));
    }
  }

  private createTransaction(data: any): Result<Transaction> {
    try {
      const transaction = Transaction.create(data);
      return Result.success(transaction);
    } catch (error) {
      return Result.failure(new Error(`Failed to create transaction: ${error.message}`));
    }
  }

  private createCustomer(customerData: CreateTransactionRequest['customer']): Result<Customer> {
    try {
      const customer = Customer.create({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
      });
      return Result.success(customer);
    } catch (error) {
      return Result.failure(new Error(`Failed to create customer: ${error.message}`));
    }
  }

  private createDeliveryWithTransaction(deliveryData: Delivery, transactionId: number): Result<Delivery> {
    try {
      const delivery = new Delivery(
        deliveryData.id,
        transactionId,
        deliveryData.address,
        deliveryData.city,
        deliveryData.postalCode,
        deliveryData.phone,
        deliveryData.deliveryFee,
        deliveryData.status,
        deliveryData.createdAt,
        deliveryData.updatedAt,
      );
      return Result.success(delivery);
    } catch (error) {
      return Result.failure(new Error(`Failed to create delivery with transaction: ${error.message}`));
    }
  }

  private async saveTransaction(transaction: Transaction): Promise<Result<Transaction>> {
    return this.safeAsyncCall(
      () => this.transactionRepository.save(transaction),
      'Failed to save transaction'
    );
  }

  private async saveDelivery(delivery: Delivery): Promise<Result<Delivery>> {
    return this.safeAsyncCall(
      () => this.deliveryRepository.save(delivery),
      'Failed to save delivery'
    );
  }

  // ✅ Helper method to wrap async calls safely
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