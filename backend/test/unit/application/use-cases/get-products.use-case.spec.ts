// test/unit/application/use-cases/get-products/get-products.use-case.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GetProductsUseCase } from '../../../../src/application/use-cases/get-products/get-products.use-case';
import { Product } from '../../../../src/domain/entities/product.entity';
import { Result } from '../../../../src/shared/utils/result.util';

// Imports de símbolos
import { PRODUCT_REPOSITORY } from '../../../../src/domain/repositories/product.repository';

// 🎭 MOCKS
const mockProductRepository = {
  findAll: jest.fn(),
  findAvailable: jest.fn(),
  findById: jest.fn(),
};

describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;
  let mockProducts: Product[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductsUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
      ],
    }).compile();

    useCase = module.get<GetProductsUseCase>(GetProductsUseCase);

    // 🏗️ Mock products
    mockProducts = [
      new Product(1, 'iPhone 14', 'Latest iPhone', 100000, 10, 'https://img1.jpg', 5000),
      new Product(2, 'Samsung Galaxy', 'Android phone', 80000, 5, 'https://img2.jpg', 4000),
      new Product(3, 'iPad Pro', 'Tablet device', 120000, 3, 'https://img3.jpg', 6000),
      new Product(4, 'MacBook Air', 'Laptop computer', 200000, 2, 'https://img4.jpg', 10000),
      new Product(5, 'AirPods', 'Wireless earphones', 50000, 15, 'https://img5.jpg', 2500),
    ];

    jest.clearAllMocks();
  });

  describe('execute - Get All Products', () => {
    it('should get all products successfully without parameters', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute();

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(mockProducts);
      expect(result.value!.total).toBe(5);
      expect(result.value!.hasMore).toBe(false);
      expect(mockProductRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should get all products with empty request object', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute({});

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(mockProducts);
      expect(result.value!.total).toBe(5);
      expect(result.value!.hasMore).toBe(false);
    });

    it('should get available products only', async () => {
      // 🏗️ ARRANGE
      const availableProducts = mockProducts.slice(0, 3); // First 3 products
      mockProductRepository.findAvailable.mockResolvedValue(availableProducts);

      // ⚡ ACT
      const result = await useCase.execute({ availableOnly: true });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(availableProducts);
      expect(result.value!.total).toBe(3);
      expect(result.value!.hasMore).toBe(false);
      expect(mockProductRepository.findAvailable).toHaveBeenCalledTimes(1);
      expect(mockProductRepository.findAll).not.toHaveBeenCalled();
    });

    it('should apply pagination with limit only', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute({ limit: 3 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(mockProducts.slice(0, 3));
      expect(result.value!.total).toBe(5); // Total original
      expect(result.value!.hasMore).toBe(true); // More items available
    });

    it('should apply pagination with limit and offset', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute({ limit: 2, offset: 2 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(mockProducts.slice(2, 4)); // Items 2-3
      expect(result.value!.total).toBe(5);
      expect(result.value!.hasMore).toBe(true);
    });

    it('should apply offset without limit', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute({ offset: 2 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(mockProducts.slice(2)); // From index 2 to end
      expect(result.value!.total).toBe(5);
      expect(result.value!.hasMore).toBe(false);
    });

    it('should handle pagination beyond available items', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute({ limit: 10, offset: 3 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(mockProducts.slice(3)); // Last 2 items
      expect(result.value!.total).toBe(5);
      expect(result.value!.hasMore).toBe(false); // No more items
    });

    it('should handle empty product list', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue([]);

      // ⚡ ACT
      const result = await useCase.execute();

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual([]);
      expect(result.value!.total).toBe(0);
      expect(result.value!.hasMore).toBe(false);
    });

    it('should combine availableOnly with pagination', async () => {
      // 🏗️ ARRANGE
      const availableProducts = mockProducts.slice(0, 4);
      mockProductRepository.findAvailable.mockResolvedValue(availableProducts);

      // ⚡ ACT
      const result = await useCase.execute({ 
        availableOnly: true, 
        limit: 2, 
        offset: 1 
      });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(availableProducts.slice(1, 3));
      expect(result.value!.total).toBe(4);
      expect(result.value!.hasMore).toBe(true);
    });
  });

  describe('execute - Validation Errors', () => {
    it('should fail with invalid limit (zero)', async () => {
      // ⚡ ACT
      const result = await useCase.execute({ limit: 0 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Limit must be greater than 0');
    });

    it('should fail with invalid limit (negative)', async () => {
      // ⚡ ACT
      const result = await useCase.execute({ limit: -5 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Limit must be greater than 0');
    });

    it('should fail with invalid offset (negative)', async () => {
      // ⚡ ACT
      const result = await useCase.execute({ offset: -1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Offset must be greater than or equal to 0');
    });

    it('should fail with limit exceeding maximum', async () => {
      // ⚡ ACT
      const result = await useCase.execute({ limit: 101 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Limit cannot exceed 100 items');
    });

    it('should allow limit at maximum boundary', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute({ limit: 100 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
    });

    it('should allow offset at zero boundary', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // ⚡ ACT
      const result = await useCase.execute({ offset: 0 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('execute - Repository Errors', () => {
    it('should handle repository error when finding all products', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockRejectedValue(new Error('Database connection failed'));

      // ⚡ ACT
      const result = await useCase.execute();

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to retrieve products');
      expect(result.error?.message).toContain('Database connection failed');
    });

    it('should handle repository error when finding available products', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAvailable.mockRejectedValue(new Error('Query timeout'));

      // ⚡ ACT
      const result = await useCase.execute({ availableOnly: true });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to retrieve products');
      expect(result.error?.message).toContain('Query timeout');
    });
  });

  describe('executeGetById - Get Product By ID', () => {
    it('should get product by ID successfully', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      const expectedProduct = mockProducts[0];
      mockProductRepository.findById.mockResolvedValue(expectedProduct);

      // ⚡ ACT
      const result = await useCase.executeGetById({ productId });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.product).toEqual(expectedProduct);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should fail when product is not found', async () => {
      // 🏗️ ARRANGE
      const productId = 999;
      mockProductRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.executeGetById({ productId });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Product with ID 999 not found');
    });

    it('should fail with invalid product ID (zero)', async () => {
      // ⚡ ACT
      const result = await useCase.executeGetById({ productId: 0 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Valid product ID is required');
    });

    it('should fail with invalid product ID (negative)', async () => {
      // ⚡ ACT
      const result = await useCase.executeGetById({ productId: -1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Valid product ID is required');
    });

    it('should handle repository error when finding product by ID', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      mockProductRepository.findById.mockRejectedValue(new Error('Database error'));

      // ⚡ ACT
      const result = await useCase.executeGetById({ productId });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to retrieve product');
      expect(result.error?.message).toContain('Database error');
    });
  });

  describe('Edge Cases and Metadata Calculation', () => {
    it('should calculate hasMore correctly when exactly at limit', async () => {
      // 🏗️ ARRANGE
      const threeProducts = mockProducts.slice(0, 3);
      mockProductRepository.findAll.mockResolvedValue(threeProducts);

      // ⚡ ACT
      const result = await useCase.execute({ limit: 3, offset: 0 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(threeProducts);
      expect(result.value!.total).toBe(3);
      expect(result.value!.hasMore).toBe(false); // No more items beyond limit
    });

    it('should handle large offset with small result set', async () => {
      // 🏗️ ARRANGE
      const twoProducts = mockProducts.slice(0, 2);
      mockProductRepository.findAll.mockResolvedValue(twoProducts);

      // ⚡ ACT
      const result = await useCase.execute({ offset: 5 }); // Offset beyond available items

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual([]); // Empty result
      expect(result.value!.total).toBe(2);
      expect(result.value!.hasMore).toBe(false);
    });

    it('should handle single product result', async () => {
      // 🏗️ ARRANGE
      const singleProduct = [mockProducts[0]];
      mockProductRepository.findAll.mockResolvedValue(singleProduct);

      // ⚡ ACT
      const result = await useCase.execute({ limit: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.products).toEqual(singleProduct);
      expect(result.value!.total).toBe(1);
      expect(result.value!.hasMore).toBe(false);
    });

    it('should handle undefined vs null product correctly', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findById.mockResolvedValue(undefined);

      // ⚡ ACT
      const result = await useCase.executeGetById({ productId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toBe('Product with ID 1 not found');
    });
  });

  describe('Safe Async Call Coverage', () => {
    it('should handle various async operation failures', async () => {
      // Test para findAll
      mockProductRepository.findAll.mockRejectedValue(new Error('Network error'));
      
      const result1 = await useCase.execute();
      expect(result1.isSuccess).toBe(false);
      expect(result1.error?.message).toContain('Failed to retrieve products');

      // Reset and test para findAvailable
      jest.clearAllMocks();
      mockProductRepository.findAvailable.mockRejectedValue(new Error('Timeout error'));
      
      const result2 = await useCase.execute({ availableOnly: true });
      expect(result2.isSuccess).toBe(false);
      expect(result2.error?.message).toContain('Failed to retrieve products');

      // Reset and test para findById
      jest.clearAllMocks();
      mockProductRepository.findById.mockRejectedValue(new Error('Connection lost'));
      
      const result3 = await useCase.executeGetById({ productId: 1 });
      expect(result3.isSuccess).toBe(false);
      expect(result3.error?.message).toContain('Failed to retrieve product');
    });
  });

  describe('Complex Pagination Scenarios', () => {
    it('should handle pagination with exactly matching boundaries', async () => {
      // 🏗️ ARRANGE
      mockProductRepository.findAll.mockResolvedValue(mockProducts); // 5 products

      const scenarios = [
        { limit: 2, offset: 0, expectedLength: 2, expectedHasMore: true },
        { limit: 2, offset: 2, expectedLength: 2, expectedHasMore: true },
        { limit: 2, offset: 4, expectedLength: 1, expectedHasMore: false },
        { limit: 5, offset: 0, expectedLength: 5, expectedHasMore: false },
        { limit: 10, offset: 0, expectedLength: 5, expectedHasMore: false },
      ];

      for (const scenario of scenarios) {
        const result = await useCase.execute({ 
          limit: scenario.limit, 
          offset: scenario.offset 
        });
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.products).toHaveLength(scenario.expectedLength);
        expect(result.value!.hasMore).toBe(scenario.expectedHasMore);
      }
    });
  });

  describe('Method Coverage Verification', () => {
    it('should execute all private methods through public interface', async () => {
      // Este test asegura que todos los métodos privados se ejecuten
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      // Test execute method covering:
      const result1 = await useCase.execute({ limit: 2, offset: 1 });
      expect(result1.isSuccess).toBe(true);
      // - validateRequest ✅
      // - getProducts ✅
      // - applyPagination ✅
      // - calculateMetadata ✅
      // - safeAsyncCall ✅

      // Test executeGetById method covering:
      mockProductRepository.findById.mockResolvedValue(mockProducts[0]);
      const result2 = await useCase.executeGetById({ productId: 1 });
      expect(result2.isSuccess).toBe(true);
      // - validateProductId ✅
      // - getProductById ✅
      // - safeAsyncCall ✅
    });
  });
});