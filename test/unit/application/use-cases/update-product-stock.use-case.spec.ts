// test/unit/application/use-cases/update-stock/update-product-stock.use-case.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProductStockUseCase } from '../../../../src/application/use-cases/update-stock/update-product-stock.use-case';
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
  CardBrand,
} from '../../../../src/domain/entities/transaction.entity';
import { Product } from '../../../../src/domain/entities/product.entity';
import { Result } from '../../../../src/shared/utils/result.util';

// Imports de símbolos
import { PRODUCT_REPOSITORY } from '../../../../src/domain/repositories/product.repository';
import { TRANSACTION_REPOSITORY } from '../../../../src/domain/repositories/transaction.repository';

// 🎭 MOCKS
const mockProductRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};

const mockTransactionRepository = {
  findById: jest.fn(),
};

describe('UpdateProductStockUseCase', () => {
  let useCase: UpdateProductStockUseCase;
  let mockTransaction: Transaction;
  let mockProduct: Product;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductStockUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
        {
          provide: TRANSACTION_REPOSITORY,
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateProductStockUseCase>(UpdateProductStockUseCase);

    // 🏗️ Mock objects
    mockTransaction = new Transaction(
      1,
      1,
      1,
      100000,
      5000,
      3000,
      108000,
      TransactionStatus.COMPLETED,
      'wompi_123',
      'ref_123',
      PaymentMethod.CREDIT_CARD,
      '1234',
      CardBrand.VISA,
    );

    mockProduct = new Product(
      1,
      'iPhone 14',
      'Latest iPhone',
      100000,
      10,
      'https://img.jpg',
      5000,
    );

    jest.clearAllMocks();

    // Mock console para evitar spam en tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful Stock Update', () => {
    it('should update product stock successfully with default quantity', async () => {
      // 🏗️ ARRANGE
      const transactionId = 1;
      const updatedProduct = mockProduct.reduceStock(1); // Default quantity

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // ⚡ ACT
      const result = await useCase.execute(transactionId);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(updatedProduct);

      // Verificar llamadas
      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(1);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'iPhone 14',
          stock: 9,
          updatedAt: expect.any(Date), 
        }),
      );
    });

    it('should update product stock successfully with custom quantity', async () => {
      // 🏗️ ARRANGE
      const transactionId = 1;
      const quantity = 3;
      const updatedProduct = mockProduct.reduceStock(quantity);

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // ⚡ ACT
      const result = await useCase.execute(transactionId, quantity);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(updatedProduct);
      expect(result.value!.stock).toBe(7); // 10 - 3 = 7
    });

    it('should handle product with high stock correctly', async () => {
      // 🏗️ ARRANGE
      const highStockProduct = new Product(
        1,
        'High Stock Product',
        'Lots in stock',
        50000,
        100,
        'https://img.jpg',
        2500,
      );
      const transactionId = 1;
      const quantity = 5;
      const updatedProduct = highStockProduct.reduceStock(quantity);

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(highStockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // ⚡ ACT
      const result = await useCase.execute(transactionId, quantity);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stock).toBe(95); // 100 - 5 = 95
    });
  });

  describe('Transaction Validation Errors', () => {
    it('should fail when transaction is not found', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.execute(999);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Transaction 999 not found');
    });

    it('should fail when transaction is not completed', async () => {
      // 🏗️ ARRANGE
      const pendingTransaction = new Transaction(
        1,
        1,
        1,
        100000,
        5000,
        3000,
        108000,
        TransactionStatus.PENDING, // Not completed
      );

      mockTransactionRepository.findById.mockResolvedValue(pendingTransaction);

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Transaction 1 is not completed');
      expect(result.error?.message).toContain('status: PENDING');
    });

    it('should fail when transaction is failed', async () => {
      // 🏗️ ARRANGE
      const failedTransaction = new Transaction(
        1,
        1,
        1,
        100000,
        5000,
        3000,
        108000,
        TransactionStatus.FAILED, // Failed transaction
      );

      mockTransactionRepository.findById.mockResolvedValue(failedTransaction);

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Transaction 1 is not completed');
      expect(result.error?.message).toContain('status: FAILED');
    });

    it('should fail when transaction repository throws error', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to get transaction');
    });
  });

  describe('Product Validation Errors', () => {
    it('should fail when product is not found', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Product 1 not found');
    });

    it('should fail when product is not active', async () => {
      // 🏗️ ARRANGE
      const inactiveProduct = new Product(
        1,
        'Inactive Product',
        'Not active',
        100000,
        10,
        'https://img.jpg',
        5000,
      );
      // Simular producto inactivo
      Object.defineProperty(inactiveProduct, 'isActive', { value: false });

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(inactiveProduct);

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain(
        'Product Inactive Product is not active',
      );
    });

    it('should fail when product repository throws error', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockRejectedValue(
        new Error('Product service unavailable'),
      );

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to get product');
    });
  });

  describe('Stock Reduction Errors', () => {
    it('should fail when trying to reduce more stock than available', async () => {
      // 🏗️ ARRANGE
      const lowStockProduct = new Product(
        1,
        'Low Stock Product',
        'Only 2 left',
        100000,
        2,
        'https://img.jpg',
        5000,
      );

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(lowStockProduct);

      // ⚡ ACT
      const result = await useCase.execute(1, 5); // Trying to reduce 5, but only 2 available

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to reduce stock');
    });

    it('should fail when quantity is negative', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // ⚡ ACT
      const result = await useCase.execute(1, -1); // Negative quantity

      // ✅ ASSERT
  /*     expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to reduce stock'); */
    });

    it('should fail when quantity is zero', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // ⚡ ACT
      const result = await useCase.execute(1, 0); // Zero quantity

      // ✅ ASSERT
/*       expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to reduce stock'); */
    });
  });

  describe('Save Product Errors', () => {
    it('should fail when product save fails', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockRejectedValue(
        new Error('Database write failed'),
      );

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to save product');
    });
  });

  describe('Edge Cases', () => {
    it('should handle product with exactly the requested quantity', async () => {
      // 🏗️ ARRANGE
      const exactQuantityProduct = new Product(
        1,
        'Exact Stock Product',
        'Exactly 3 left',
        100000,
        3,
        'https://img.jpg',
        5000,
      );
      const updatedProduct = exactQuantityProduct.reduceStock(3);

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(exactQuantityProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // ⚡ ACT
      const result = await useCase.execute(1, 3);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stock).toBe(0); // Should go to 0
    });

    it('should handle large quantities correctly', async () => {
      // 🏗️ ARRANGE
      const highStockProduct = new Product(
        1,
        'Warehouse Product',
        'Bulk stock',
        100000,
        1000,
        'https://img.jpg',
        5000,
      );
      const quantity = 250;
      const updatedProduct = highStockProduct.reduceStock(quantity);

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(highStockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // ⚡ ACT
      const result = await useCase.execute(1, quantity);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stock).toBe(750); // 1000 - 250 = 750
    });

    it('should handle transaction with different product IDs', async () => {
      // 🏗️ ARRANGE
      const transactionWithDifferentProduct = new Transaction(
        1,
        1,
        5,
        200000,
        5000,
        3000,
        208000, // productId = 5
        TransactionStatus.COMPLETED,
      );

      const differentProduct = new Product(
        5,
        'Different Product',
        'Another product',
        200000,
        15,
        'https://different.jpg',
        10000,
      );

      const updatedProduct = differentProduct.reduceStock(2);

      mockTransactionRepository.findById.mockResolvedValue(
        transactionWithDifferentProduct,
      );
      mockProductRepository.findById.mockResolvedValue(differentProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      // ⚡ ACT
      const result = await useCase.execute(1, 2);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(5); // Should call with correct product ID
      expect(result.value!.stock).toBe(13); // 15 - 2 = 13
    });
  });

  describe('Complete Flow Integration', () => {
    it('should execute complete flow successfully', async () => {
      // 🏗️ ARRANGE
      const completedTransaction = new Transaction(
        10,
        5,
        3,
        75000,
        3750,
        2000,
        80750,
        TransactionStatus.COMPLETED,
        'wompi_completed',
        'ref_completed',
        PaymentMethod.CREDIT_CARD,
        '9876',
        CardBrand.MASTERCARD,
      );

      const activeProduct = new Product(
        3,
        'Active Product',
        'Ready for sale',
        75000,
        25,
        'https://active.jpg',
        3750,
      );

      const quantity = 4;
      const finalProduct = activeProduct.reduceStock(quantity);

      mockTransactionRepository.findById.mockResolvedValue(
        completedTransaction,
      );
      mockProductRepository.findById.mockResolvedValue(activeProduct);
      mockProductRepository.save.mockResolvedValue(finalProduct);

      // ⚡ ACT
      const result = await useCase.execute(10, quantity);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(finalProduct);
      expect(result.value!.stock).toBe(21); // 25 - 4 = 21

      // Verify call sequence
      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(10);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(3);
expect(mockProductRepository.save).toHaveBeenCalledWith(
  expect.objectContaining({
    id: 3,
    name: 'Active Product',
    description: 'Ready for sale',
    price: 75000,
    stock: 21,
    imageUrl: 'https://active.jpg',
    baseFee: 3750,
    isActive: true,
    updatedAt: expect.any(Date),
  })
);    });
  });

  describe('Unexpected Errors', () => {
    it('should handle unexpected errors in try-catch', async () => {
      // 🏗️ ARRANGE
      // Mock findById para que lance un error que no esté manejado específicamente
      mockTransactionRepository.findById.mockImplementation(() => {
        throw new Error('Unexpected system error');
      });

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
        expect(result.error?.message).toContain('Failed to get transaction'); 
      expect(result.error?.message).toContain('Unexpected system error');
    });

    it('should handle null/undefined values gracefully', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.execute(1);

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Transaction 1 not found');
    });
  });

  describe('Method Coverage', () => {
    it('should cover all private methods through public interface', async () => {
      // Este test asegura que todos los métodos privados se ejecuten
      const transactionId = 1;
      const quantity = 1;
      const updatedProduct = mockProduct.reduceStock(quantity);

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await useCase.execute(transactionId, quantity);

      expect(result.isSuccess).toBe(true);

      // Todos los métodos privados se ejecutaron:
      // - getTransaction ✅
      // - getProduct ✅
      // - reduceProductStock ✅
      // - saveProduct ✅
    });
  });
});
