// test/unit/application/use-cases/create-transaction/create-transaction.use-case.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from '../../../../src/application/use-cases/create-transaction/create-transaction.use-case';
import { Transaction, TransactionStatus, PaymentMethod, CardBrand } from '../../../../src/domain/entities/transaction.entity';
import { Customer } from '../../../../src/domain/entities/customer.entity';
import { Product } from '../../../../src/domain/entities/product.entity';
import { Delivery, DeliveryStatus } from '../../../../src/domain/entities/delivery.entity';
import { Result } from '../../../../src/shared/utils/result.util';

// Imports de símbolos
import { TRANSACTION_REPOSITORY } from '../../../../src/domain/repositories/transaction.repository';
import { CUSTOMER_REPOSITORY } from '../../../../src/domain/repositories/customer.repository';
import { PRODUCT_REPOSITORY } from '../../../../src/domain/repositories/product.repository';
import { DELIVERY_REPOSITORY } from '../../../../src/domain/repositories/delivery.repository';

// 🎭 MOCKS
const mockTransactionRepository = {
  save: jest.fn(),
};

const mockCustomerRepository = {
  findByEmail: jest.fn(),
  save: jest.fn(),
};

const mockProductRepository = {
  findById: jest.fn(),
};

const mockDeliveryRepository = {
  save: jest.fn(),
};

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let mockCustomer: Customer;
  let mockProduct: Product;
  let mockDelivery: Delivery;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionUseCase,
        { provide: TRANSACTION_REPOSITORY, useValue: mockTransactionRepository },
        { provide: CUSTOMER_REPOSITORY, useValue: mockCustomerRepository },
        { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
        { provide: DELIVERY_REPOSITORY, useValue: mockDeliveryRepository },
      ],
    }).compile();

    useCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);

    // 🏗️ Mock objects
    mockCustomer = new Customer(1, 'John Doe', 'john@example.com', '+57 300 123 4567');
    mockProduct = new Product(1, 'iPhone 14', 'Latest iPhone', 100000, 10, 'https://img.jpg', 5000);
    mockDelivery = new Delivery(
      1, 1, '123 Main St', 'Bogotá', '110111', '+57 300 123 4567', 
      3000, DeliveryStatus.PENDING
    );

    jest.clearAllMocks();
  });

  describe('Successful Transaction Creation', () => {
    it('should create transaction with existing customer', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          postalCode: '110111',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
          cardLastFour: '1234',
          cardBrand: CardBrand.VISA,
        },
      };

      const savedTransaction = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        undefined, undefined,
        PaymentMethod.CREDIT_CARD, '1234', CardBrand.VISA
      );

      // Customer exists
      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockTransactionRepository.save.mockResolvedValue(savedTransaction);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.transaction).toEqual(savedTransaction);
      expect(result.value!.customer).toEqual(mockCustomer);
      expect(result.value!.product).toEqual(mockProduct);
      expect(result.value!.delivery).toEqual(mockDelivery);

      // Verificar llamadas
      expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(mockCustomerRepository.save).not.toHaveBeenCalled(); // Customer already exists
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
      expect(mockTransactionRepository.save).toHaveBeenCalled();
      expect(mockDeliveryRepository.save).toHaveBeenCalled();
    });

    it('should create transaction with new customer', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+57 300 456 7890',
        },
        productId: 1,
        quantity: 2,
        delivery: {
          address: '456 Oak Ave',
          city: 'Medellín',
          postalCode: '050001',
          phone: '+57 300 456 7890',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
          cardLastFour: '5678',
          cardBrand: CardBrand.MASTERCARD,
        },
      };

      const newCustomer = new Customer(2, 'Jane Smith', 'jane@example.com', '+57 300 456 7890');
      const savedTransaction = new Transaction(
        2, 2, 1, 200000, 5000, 3000, 208000, 
        TransactionStatus.PENDING,
        undefined, undefined,
        PaymentMethod.CREDIT_CARD, '5678', CardBrand.MASTERCARD
      );

      // Customer doesn't exist
      mockCustomerRepository.findByEmail.mockResolvedValue(null);
      mockCustomerRepository.save.mockResolvedValue(newCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockTransactionRepository.save.mockResolvedValue(savedTransaction);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.customer).toEqual(newCustomer);
      
      // Verificar que se crea nuevo customer
      expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith('jane@example.com');
      expect(mockCustomerRepository.save).toHaveBeenCalled();
    });

    it('should handle default quantity of 1', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        // No quantity specified, should default to 1
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          postalCode: '110111',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
          cardLastFour: '1234',
          cardBrand: CardBrand.VISA,
        },
      };

      const savedTransaction = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, // quantity 1 * price 100000
        TransactionStatus.PENDING
      );

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockTransactionRepository.save.mockResolvedValue(savedTransaction);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.transaction.productAmount).toBe(100000); // 1 * 100000
    });

    it('should handle optional delivery postal code', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
          // No postalCode
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
          cardLastFour: '1234',
          cardBrand: CardBrand.VISA,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockTransactionRepository.save.mockResolvedValue(new Transaction(1, 1, 1, 100000, 5000, 3000, 108000, TransactionStatus.PENDING));
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should fail with missing customer name', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: '', // Empty name
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Customer name is required');
    });

    it('should fail with missing customer email', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: '', // Empty email
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Customer email is required');
    });

    it('should fail with missing customer phone', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '', // Empty phone
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Customer phone is required');
    });

    it('should fail with invalid product ID', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 0, // Invalid product ID
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Valid product ID is required');
    });

    it('should fail with invalid quantity', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: -1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Quantity must be greater than 0');
    });

    it('should fail with missing delivery address', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '', // Empty address
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Delivery address is required');
    });

    it('should fail with missing delivery city', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: '', // Empty city
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Delivery city is required');
    });

    it('should fail with missing delivery phone', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '', // Empty phone
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Delivery phone is required');
    });
  });

  describe('Product Validation Errors', () => {
    it('should fail when product is not found', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 999,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(null); // Product not found

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Product with ID 999 not found');
    });

    it('should fail when product is not available', async () => {
      // 🏗️ ARRANGE
      const unavailableProduct = new Product(1, 'Unavailable Product', 'Out of stock', 100000, 0, 'img.jpg', 5000);
      
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(unavailableProduct);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('is not available');
    });

    it('should fail when insufficient stock', async () => {
      // 🏗️ ARRANGE
      const lowStockProduct = new Product(1, 'Low Stock Product', 'Only 2 left', 100000, 2, 'img.jpg', 5000);
      
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 5, // Requesting more than available
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(lowStockProduct);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Insufficient stock');
      expect(result.error?.message).toContain('Available: 2, Requested: 5');
    });
  });

  describe('Database Errors', () => {
    it('should fail when customer repository throws error', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockRejectedValue(new Error('Database connection failed'));

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to find customer by email');
    });

    it('should fail when product repository throws error', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockRejectedValue(new Error('Product service unavailable'));

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to find product');
    });

    it('should fail when transaction save fails', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockTransactionRepository.save.mockRejectedValue(new Error('Transaction save failed'));

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to save transaction');
    });

    it('should fail when delivery save fails', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      const savedTransaction = new Transaction(1, 1, 1, 100000, 5000, 3000, 108000, TransactionStatus.PENDING);

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockTransactionRepository.save.mockResolvedValue(savedTransaction);
      mockDeliveryRepository.save.mockRejectedValue(new Error('Delivery save failed'));

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to save delivery');
    });

    it('should fail when customer save fails for new customer', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'New Customer',
          email: 'new@example.com',
          phone: '+57 300 999 9999',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(null); // Customer doesn't exist
      mockCustomerRepository.save.mockRejectedValue(new Error('Customer save failed'));

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to save customer');
    });
  });

  describe('Entity Creation Errors', () => {
    it('should handle Transaction.create errors', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      // Mock product with invalid data that would cause Transaction.create to fail
      const invalidProduct = new Product(1, 'Product', 'Desc', -100, 10, 'img.jpg', -1000); // Negative prices

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(invalidProduct);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to create transaction');
    });

    it('should handle Customer.create errors', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'invalid-email', // Invalid email format
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(null); // Customer doesn't exist

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to create customer');
    });

    it('should handle Delivery.create errors', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 1,
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: 'invalid-phone', // Invalid phone format
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to save delivery');
    });
  });

  describe('Amount Calculations', () => {
    it('should calculate amounts correctly for multiple quantities', async () => {
      // 🏗️ ARRANGE
      const request = {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+57 300 123 4567',
        },
        productId: 1,
        quantity: 3, // Multiple quantity
        delivery: {
          address: '123 Main St',
          city: 'Bogotá',
          phone: '+57 300 123 4567',
        },
        payment: {
          method: PaymentMethod.CREDIT_CARD,
        },
      };

      const savedTransaction = new Transaction(
        1, 1, 1, 300000, 5000, 3000, 308000, // 3 * 100000 + 5000 + 3000
        TransactionStatus.PENDING
      );

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockTransactionRepository.save.mockResolvedValue(savedTransaction);
      mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

      // ⚡ ACT
      const result = await useCase.execute(request);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
expect(result.value!.transaction.productAmount).toBe(300000); // 3 * 100000
     expect(result.value!.transaction.baseFee).toBe(5000);
     expect(result.value!.transaction.deliveryFee).toBe(3000);
     expect(result.value!.transaction.totalAmount).toBe(308000); // 300000 + 5000 + 3000
   });
 });

 describe('Edge Cases', () => {
   it('should handle whitespace in string inputs', async () => {
     // 🏗️ ARRANGE
     const request = {
       customer: {
         name: '  John Doe  ', // With whitespace
         email: '  john@example.com  ',
         phone: '  +57 300 123 4567  ',
       },
       productId: 1,
       quantity: 1,
       delivery: {
         address: '  123 Main St  ',
         city: '  Bogotá  ',
         phone: '  +57 300 123 4567  ',
       },
       payment: {
         method: PaymentMethod.CREDIT_CARD,
       },
     };

     const savedTransaction = new Transaction(1, 1, 1, 100000, 5000, 3000, 108000, TransactionStatus.PENDING);

     mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
     mockProductRepository.findById.mockResolvedValue(mockProduct);
     mockTransactionRepository.save.mockResolvedValue(savedTransaction);
     mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

     // ⚡ ACT
     const result = await useCase.execute(request);

     // ✅ ASSERT
     expect(result.isSuccess).toBe(true);
   });

   it('should handle trimmed empty strings as validation errors', async () => {
     // 🏗️ ARRANGE
     const request = {
       customer: {
         name: '   ', // Only whitespace
         email: 'john@example.com',
         phone: '+57 300 123 4567',
       },
       productId: 1,
       quantity: 1,
       delivery: {
         address: '123 Main St',
         city: 'Bogotá',
         phone: '+57 300 123 4567',
       },
       payment: {
         method: PaymentMethod.CREDIT_CARD,
       },
     };

     // ⚡ ACT
     const result = await useCase.execute(request);

     // ✅ ASSERT
     expect(result.isSuccess).toBe(false);
     expect(result.error?.message).toBe('Customer name is required');
   });

   it('should handle undefined optional fields gracefully', async () => {
     // 🏗️ ARRANGE
     const request = {
       customer: {
         name: 'John Doe',
         email: 'john@example.com',
         phone: '+57 300 123 4567',
       },
       productId: 1,
       // quantity: undefined (optional)
       delivery: {
         address: '123 Main St',
         city: 'Bogotá',
         phone: '+57 300 123 4567',
         // postalCode: undefined (optional)
       },
       payment: {
         method: PaymentMethod.CREDIT_CARD,
         // cardLastFour: undefined (optional)
         // cardBrand: undefined (optional)
       },
     };

     const savedTransaction = new Transaction(1, 1, 1, 100000, 5000, 3000, 108000, TransactionStatus.PENDING);

     mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
     mockProductRepository.findById.mockResolvedValue(mockProduct);
     mockTransactionRepository.save.mockResolvedValue(savedTransaction);
     mockDeliveryRepository.save.mockResolvedValue(mockDelivery);

     // ⚡ ACT
     const result = await useCase.execute(request);

     // ✅ ASSERT
     expect(result.isSuccess).toBe(true);
   });

   it('should handle negative quantity validation', async () => {
     // 🏗️ ARRANGE
     const request = {
       customer: {
         name: 'John Doe',
         email: 'john@example.com',
         phone: '+57 300 123 4567',
       },
       productId: 1,
       quantity: -1, // Negative quantity
       delivery: {
         address: '123 Main St',
         city: 'Bogotá',
         phone: '+57 300 123 4567',
       },
       payment: {
         method: PaymentMethod.CREDIT_CARD,
       },
     };

     // ⚡ ACT
     const result = await useCase.execute(request);

     // ✅ ASSERT
     expect(result.isSuccess).toBe(false);
     expect(result.error?.message).toBe('Quantity must be greater than 0');
   });

   it('should handle delivery with transaction ID assignment correctly', async () => {
     // 🏗️ ARRANGE
     const request = {
       customer: {
         name: 'John Doe',
         email: 'john@example.com',
         phone: '+57 300 123 4567',
       },
       productId: 1,
       quantity: 1,
       delivery: {
         address: '123 Main St',
         city: 'Bogotá',
         phone: '+57 300 123 4567',
       },
       payment: {
         method: PaymentMethod.CREDIT_CARD,
       },
     };

     const savedTransaction = new Transaction(5, 1, 1, 100000, 5000, 3000, 108000, TransactionStatus.PENDING);
     const savedDeliveryWithTxnId = new Delivery(
       1, 5, '123 Main St', 'Bogotá', 'undefined', '+57 300 123 4567', 
       3000, DeliveryStatus.PENDING
     );

     mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);
     mockProductRepository.findById.mockResolvedValue(mockProduct);
     mockTransactionRepository.save.mockResolvedValue(savedTransaction);
     mockDeliveryRepository.save.mockResolvedValue(savedDeliveryWithTxnId);

     // ⚡ ACT
     const result = await useCase.execute(request);

     // ✅ ASSERT
     expect(result.isSuccess).toBe(true);
     expect(result.value!.delivery.transactionId).toBe(5); // Should match saved transaction ID
   });
 });

 describe('Complete Flow Integration', () => {
   it('should execute complete flow with all components working together', async () => {
     // 🏗️ ARRANGE - Complex scenario
     const request = {
       customer: {
         name: 'María García',
         email: 'maria.garcia@example.com',
         phone: '+57 301 234 5678',
       },
       productId: 1,
       quantity: 2,
       delivery: {
         address: 'Carrera 15 #93-47, Apto 503',
         city: 'Bogotá',
         postalCode: '110221',
         phone: '+57 301 234 5678',
       },
       payment: {
         method: PaymentMethod.CREDIT_CARD,
         cardLastFour: '9876',
         cardBrand: CardBrand.MASTERCARD,
       },
     };

     const newCustomer = new Customer(10, 'María García', 'maria.garcia@example.com', '+57 301 234 5678');
     const savedTransaction = new Transaction(
       20, 10, 1, 200000, 5000, 3000, 208000, 
       TransactionStatus.PENDING,
       undefined, undefined,
       PaymentMethod.CREDIT_CARD, '9876', CardBrand.MASTERCARD
     );
     const savedDelivery = new Delivery(
       15, 20, 'Carrera 15 #93-47, Apto 503', 'Bogotá', '110221', '+57 301 234 5678',
       3000, DeliveryStatus.PENDING
     );

     // Customer doesn't exist initially
     mockCustomerRepository.findByEmail.mockResolvedValue(null);
     mockCustomerRepository.save.mockResolvedValue(newCustomer);
     mockProductRepository.findById.mockResolvedValue(mockProduct);
     mockTransactionRepository.save.mockResolvedValue(savedTransaction);
     mockDeliveryRepository.save.mockResolvedValue(savedDelivery);

     // ⚡ ACT
     const result = await useCase.execute(request);

     // ✅ ASSERT
     expect(result.isSuccess).toBe(true);
     
     // Verify complete response structure
     expect(result.value!).toHaveProperty('transaction');
     expect(result.value!).toHaveProperty('customer');
     expect(result.value!).toHaveProperty('product');
     expect(result.value!).toHaveProperty('delivery');
     
     // Verify data integrity
     expect(result.value!.transaction.customerId).toBe(newCustomer.id);
     expect(result.value!.transaction.productId).toBe(mockProduct.id);
     expect(result.value!.delivery.transactionId).toBe(savedTransaction.id);
     
     // Verify calculations
     expect(result.value!.transaction.productAmount).toBe(200000); // 2 * 100000
     expect(result.value!.transaction.totalAmount).toBe(208000); // 200000 + 5000 + 3000
     
     // Verify all repositories were called in correct order
     expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith('maria.garcia@example.com');
     expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);
     expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
     expect(mockTransactionRepository.save).toHaveBeenCalledTimes(1);
     expect(mockDeliveryRepository.save).toHaveBeenCalledTimes(1);
   });
 });

 describe('Safe Async Call Coverage', () => {
   it('should handle various async operation failures', async () => {
     // Este test asegura cobertura del método safeAsyncCall
     const scenarios = [
       {
         mockSetup: () => mockCustomerRepository.findByEmail.mockRejectedValue(new Error('Network timeout')),
         expectedError: 'Failed to find customer by email'
       },
       {
         mockSetup: () => {
           mockCustomerRepository.findByEmail.mockResolvedValue(null);
           mockCustomerRepository.save.mockRejectedValue(new Error('Constraint violation'));
         },
         expectedError: 'Failed to save customer'
       }
     ];

     for (const scenario of scenarios) {
       // Reset mocks
       jest.clearAllMocks();
       
       // Setup scenario
       scenario.mockSetup();
       
       const request = {
         customer: {
           name: 'Test User',
           email: 'test@example.com',
           phone: '+57 300 000 0000',
         },
         productId: 1,
         quantity: 1,
         delivery: {
           address: 'Test Address',
           city: 'Test City',
           phone: '+57 300 000 0000',
         },
         payment: {
           method: PaymentMethod.CREDIT_CARD,
         },
       };

       const result = await useCase.execute(request);
       
       expect(result.isSuccess).toBe(false);
       expect(result.error?.message).toContain(scenario.expectedError);
     }
   });
 });
});