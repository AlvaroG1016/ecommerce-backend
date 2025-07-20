// test/unit/application/use-cases/process-payment.use-case.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessPaymentUseCase } from '../../../../src/application/use-cases/process-payment/process-payment.use-case';
import { Transaction, TransactionStatus, PaymentMethod, CardBrand } from '../../../../src/domain/entities/transaction.entity';
import { Product } from '../../../../src/domain/entities/product.entity';
import { Customer } from '../../../../src/domain/entities/customer.entity';
import { Result } from '../../../../src/shared/utils/result.util';

// ✅ IMPORTAR LOS SÍMBOLOS EXACTOS
import { PAYMENT_SERVICE } from '../../../../src/domain/services/payment.service.interface';
import { TRANSACTION_REPOSITORY } from '../../../../src/domain/repositories/transaction.repository';
import { PRODUCT_REPOSITORY } from '../../../../src/domain/repositories/product.repository';
import { CUSTOMER_REPOSITORY } from '../../../../src/domain/repositories/customer.repository';

// 🎭 MOCKS de las dependencias
const mockPaymentService = {
  processPayment: jest.fn(),
};

const mockTransactionRepository = {
  findById: jest.fn(),
  update: jest.fn(),
};

const mockProductRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};

const mockCustomerRepository = {
  findById: jest.fn(),
};

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let mockTransaction: Transaction;
  let mockProduct: Product;
  let mockCustomer: Customer;

  beforeEach(async () => {
    // 🏗️ Configurar módulo con los símbolos EXACTOS
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessPaymentUseCase,
        // ✅ USAR LOS SÍMBOLOS IMPORTADOS
        { provide: PAYMENT_SERVICE, useValue: mockPaymentService },
        { provide: TRANSACTION_REPOSITORY, useValue: mockTransactionRepository },
        { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
        { provide: CUSTOMER_REPOSITORY, useValue: mockCustomerRepository },
      ],
    }).compile();

    useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);

    // 🏗️ Configurar objetos mock
    mockTransaction = new Transaction(
      1, 1, 1, 100000, 5000, 3000, 108000, 
      TransactionStatus.PENDING,
      undefined, undefined,
      PaymentMethod.CREDIT_CARD, '1234', CardBrand.VISA
    );

    mockProduct = new Product(
      1, 'iPhone 14', 'Latest iPhone', 100000, 10, 'https://img.jpg', 5000
    );

    mockCustomer = new Customer(
      1, 'John Doe', 'john@example.com', '+57 300 123 4567'
    );

    // 🧹 Limpiar mocks
    jest.clearAllMocks();
  });

  describe('Successful Payment Flow', () => {
    it('should process payment successfully with approved status', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
      
      const completedTransaction = mockTransaction.markAsCompleted('wompi_123', 'ref_123');
      mockTransactionRepository.update.mockResolvedValue(completedTransaction);
      
      const updatedProduct = mockProduct.reduceStock(1);
      mockProductRepository.save.mockResolvedValue(updatedProduct);
      
      mockPaymentService.processPayment.mockResolvedValue({
        success: true,
        status: 'APPROVED',
        providerTransactionId: 'wompi_123',
        reference: 'ref_123',
        message: 'Payment approved',
      });

      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value?.paymentSuccess).toBe(true);
      expect(result.value?.message).toBe('Payment processed successfully');
      expect(result.value?.requiresPolling).toBe(false);
      
      // Verificar llamadas
      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(1);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(1);
      expect(mockPaymentService.processPayment).toHaveBeenCalled();
      expect(mockTransactionRepository.update).toHaveBeenCalled();
      expect(mockProductRepository.save).toHaveBeenCalled();
    });

    it('should handle pending payment status', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
      
      const pendingTransaction = mockTransaction.markAsPending('wompi_456', 'ref_456');
      mockTransactionRepository.update.mockResolvedValue(pendingTransaction);
      
      mockPaymentService.processPayment.mockResolvedValue({
        success: false,
        status: 'PENDING',
        providerTransactionId: 'wompi_456',
        reference: 'ref_456',
        message: 'Payment is processing',
      });

      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value?.paymentSuccess).toBe(false);
      expect(result.value?.requiresPolling).toBe(true);
      expect(result.value?.message).toContain('being processed');
      
      // No debe actualizar stock para pagos pendientes
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should fail when transaction not found', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 999,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Transaction 999 not found');
    });

    it('should fail when product not found', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Product 1 not found');
    });

    it('should fail when customer not found', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCustomerRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Customer 1 not found');
    });

    it('should fail with invalid transaction ID', async () => {
      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 0, // ID inválido
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Valid transaction ID is required');
    });

    it('should fail with empty card number', async () => {
      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 1,
        cardNumber: '', // Vacío
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Card number is required');
    });
  });

  describe('Payment Provider Errors', () => {
    it('should handle payment provider failure', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
      
      const failedTransaction = mockTransaction.markAsFailed();
      mockTransactionRepository.update.mockResolvedValue(failedTransaction);
      
      mockPaymentService.processPayment.mockRejectedValue(new Error('Provider timeout'));

      // ⚡ ACT
      const result = await useCase.execute({
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Payment processing failed');
    });
  });
});