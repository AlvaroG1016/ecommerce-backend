import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../get-products/get-products.use-case';
import { Transaction, PaymentMethod, CardBrand } from '../../entities/transaction.entity';
import { Customer } from '../../entities/customer.entity';
import { Product } from '../../entities/product.entity';
import { Delivery } from '../../entities/delivery.entity';
import { TransactionRepository, TRANSACTION_REPOSITORY } from '../../repositories/transaction.repository';
import { CustomerRepository, CUSTOMER_REPOSITORY } from '../../repositories/customer.repository';
import { ProductRepository, PRODUCT_REPOSITORY } from '../../repositories/product.repository';
import { DeliveryRepository, DELIVERY_REPOSITORY } from '../../repositories/delivery.repository';

// DTOs para el caso de uso
export interface CreateTransactionRequest {
  // Datos del cliente
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  
  // Datos del producto
  productId: number;
  quantity?: number;
  
  // Datos de pago
  payment: {
    method: PaymentMethod;
    cardLastFour?: string;
    cardBrand?: CardBrand;
  };
  
  // Datos de entrega
  delivery: {
    address: string;
    city: string;
    postalCode?: string;
    phone: string;
  };
}

export interface CreateTransactionResponse {
  transaction: Transaction;
  customer: Customer;
  product: Product;
  delivery: Delivery;
}

// Caso de uso implementando ROP
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
    try {
      // 1. Validar request
      const validationResult = this.validateRequest(request);
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error!);
      }

      // 2. Obtener o crear cliente
      const customerResult = await this.getOrCreateCustomer(request.customer);
      if (!customerResult.isSuccess) {
        return Result.failure(customerResult.error!);
      }
      const customer = customerResult.value!;

      // 3. Validar producto y stock
      const productResult = await this.validateProduct(request.productId, request.quantity || 1);
      if (!productResult.isSuccess) {
        return Result.failure(productResult.error!);
      }
      const product = productResult.value!;

      // 4. Crear entrega
      const deliveryResult = this.createDelivery(request.delivery);
      if (!deliveryResult.isSuccess) {
        return Result.failure(deliveryResult.error!);
      }
      const deliveryData = deliveryResult.value!;

      // 5. Calcular montos
      const quantity = request.quantity || 1;
      const productAmount = product.price * quantity;
      const baseFee = product.baseFee;
      const deliveryFee = deliveryData.deliveryFee;

      // 6. Crear transacción
      const transaction = Transaction.create({
        customerId: customer.id,
        productId: product.id,
        productAmount,
        baseFee,
        deliveryFee,
        paymentMethod: request.payment.method,
        cardLastFour: request.payment.cardLastFour,
        cardBrand: request.payment.cardBrand,
      });

      // 7. Guardar en base de datos
      const savedTransaction = await this.transactionRepository.save(transaction);
      
      // 8. Crear entrega asociada a la transacción
      const deliveryWithTransaction = new Delivery(
        deliveryData.id,
        savedTransaction.id,
        deliveryData.address,
        deliveryData.city,
        deliveryData.postalCode,
        deliveryData.phone,
        deliveryData.deliveryFee,
        deliveryData.status,
        deliveryData.createdAt,
        deliveryData.updatedAt,
      );
      
      const savedDelivery = await this.deliveryRepository.save(deliveryWithTransaction);

      // 9. Respuesta exitosa
      const response: CreateTransactionResponse = {
        transaction: savedTransaction,
        customer,
        product,
        delivery: savedDelivery,
      };

      return Result.success(response);

    } catch (error) {
      return Result.failure(
        new Error(`Failed to create transaction: ${error.message}`)
      );
    }
  }

  private validateRequest(request: CreateTransactionRequest): Result<void> {
    // Validar datos del cliente
    if (!request.customer.name?.trim()) {
      return Result.failure(new Error('Customer name is required'));
    }

    if (!request.customer.email?.trim()) {
      return Result.failure(new Error('Customer email is required'));
    }

    if (!request.customer.phone?.trim()) {
      return Result.failure(new Error('Customer phone is required'));
    }

    // Validar producto
    if (!request.productId || request.productId <= 0) {
      return Result.failure(new Error('Valid product ID is required'));
    }

    if (request.quantity && request.quantity <= 0) {
      return Result.failure(new Error('Quantity must be greater than 0'));
    }

    // Validar entrega
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
    try {
      // Buscar cliente existente por email
      const existingCustomer = await this.customerRepository.findByEmail(customerData.email);
      
      if (existingCustomer) {
        return Result.success(existingCustomer);
      }

      // Crear nuevo cliente
      const newCustomer = Customer.create({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
      });

      const savedCustomer = await this.customerRepository.save(newCustomer);
      return Result.success(savedCustomer);

    } catch (error) {
      return Result.failure(new Error(`Failed to get or create customer: ${error.message}`));
    }
  }

  private async validateProduct(productId: number, quantity: number): Promise<Result<Product>> {
    try {
      const product = await this.productRepository.findById(productId);
      
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

    } catch (error) {
      return Result.failure(new Error(`Failed to validate product: ${error.message}`));
    }
  }

  private createDelivery(deliveryData: CreateTransactionRequest['delivery']): Result<Delivery> {
    try {
      const delivery = Delivery.create({
        transactionId: 0, // Se asignará después
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
}