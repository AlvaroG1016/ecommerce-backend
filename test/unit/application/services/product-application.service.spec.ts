// test/unit/application/services/product-application.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductApplicationService } from '../../../../src/application/services/product-application.service';
import { GetProductsUseCase } from '../../../../src/application/use-cases/get-products/get-products.use-case';
import { Result } from '../../../../src/shared/utils/result.util';

// 🎭 MOCKS
const mockGetProductsUseCase = {
  execute: jest.fn(),
  executeGetById: jest.fn(),
};

describe('ProductApplicationService', () => {
  let service: ProductApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductApplicationService,
        { provide: GetProductsUseCase, useValue: mockGetProductsUseCase },
      ],
    }).compile();

    service = module.get<ProductApplicationService>(ProductApplicationService);
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should get products successfully with default request', async () => {
      // 🏗️ ARRANGE
      const mockUseCaseResponse = {
        products: [
          {
            id: 1,
            name: 'iPhone 14',
            description: 'Latest iPhone',
            price: 100000,
            stock: 10,
            isAvailable: () => true,
          },
          {
            id: 2,
            name: 'Samsung Galaxy',
            description: 'Android phone',
            price: 80000,
            stock: 5,
            isAvailable: () => true,
          },
        ],
        total: 2,
        hasMore: false,
      };

      mockGetProductsUseCase.execute.mockResolvedValue(Result.success(mockUseCaseResponse));

      // ⚡ ACT
      const result = await service.getProducts();

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUseCaseResponse);
      expect(mockGetProductsUseCase.execute).toHaveBeenCalledWith({});
    });

    it('should get products successfully with custom request', async () => {
      // 🏗️ ARRANGE
      const request = {
        availableOnly: true,
        limit: 10,
        offset: 0,
      };

      const mockUseCaseResponse = {
        products: [
          {
            id: 1,
            name: 'Available Product',
            description: 'In stock',
            price: 50000,
            stock: 15,
            isAvailable: () => true,
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockGetProductsUseCase.execute.mockResolvedValue(Result.success(mockUseCaseResponse));

      // ⚡ ACT
      const result = await service.getProducts(request);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUseCaseResponse);
      expect(mockGetProductsUseCase.execute).toHaveBeenCalledWith(request);
    });

    it('should handle empty products list', async () => {
      // 🏗️ ARRANGE
      const mockUseCaseResponse = {
        products: [],
        total: 0,
        hasMore: false,
      };

      mockGetProductsUseCase.execute.mockResolvedValue(Result.success(mockUseCaseResponse));

      // ⚡ ACT
      const result = await service.getProducts();

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUseCaseResponse);
    });

    it('should handle use case failure', async () => {
      // 🏗️ ARRANGE
      mockGetProductsUseCase.execute.mockResolvedValue(
        Result.failure(new Error('Database connection failed'))
      );

      // ⚡ ACT
      const result = await service.getProducts();

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle use case failure with no error message', async () => {
      // 🏗️ ARRANGE
      mockGetProductsUseCase.execute.mockResolvedValue(
        Result.failure(new Error())
      );

      // ⚡ ACT
      const result = await service.getProducts();

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get products');
    });

    it('should handle unexpected errors', async () => {
      // 🏗️ ARRANGE
      mockGetProductsUseCase.execute.mockRejectedValue(new Error('Unexpected system error'));

      // ⚡ ACT
      const result = await service.getProducts();

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while getting products');
    });

    it('should log correct information for successful requests', async () => {
      // 🏗️ ARRANGE
      const request = { availableOnly: true, limit: 5, offset: 10 };
      const mockUseCaseResponse = {
        products: [{ id: 1, name: 'Test Product' }],
        total: 1,
        hasMore: false,
      };

      mockGetProductsUseCase.execute.mockResolvedValue(Result.success(mockUseCaseResponse));

      // ⚡ ACT
      await service.getProducts(request);

      // ✅ ASSERT
      expect(mockGetProductsUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('getProductById', () => {
    it('should get product by ID successfully', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      const mockProduct = {
        id: 1,
        name: 'iPhone 14 Pro',
        description: 'Premium iPhone',
        price: 150000,
        stock: 3,
        isAvailable: () => true,
      };

      const mockUseCaseResponse = { product: mockProduct };

      mockGetProductsUseCase.executeGetById.mockResolvedValue(Result.success(mockUseCaseResponse));

      // ⚡ ACT
      const result = await service.getProductById(productId);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUseCaseResponse);
      expect(mockGetProductsUseCase.executeGetById).toHaveBeenCalledWith({ productId: 1 });
    });

    it('should handle product not found', async () => {
      // 🏗️ ARRANGE
      const productId = 999;
      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.failure(new Error('Product with ID 999 not found'))
      );

      // ⚡ ACT
      const result = await service.getProductById(productId);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product with ID 999 not found');
    });

    it('should handle use case failure with no error message', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.failure(new Error())
      );

      // ⚡ ACT
      const result = await service.getProductById(productId);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get product');
    });

    it('should handle unexpected errors', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      mockGetProductsUseCase.executeGetById.mockRejectedValue(new Error('System failure'));

      // ⚡ ACT
      const result = await service.getProductById(productId);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while getting product');
    });

    it('should handle different product types', async () => {
      // 🏗️ ARRANGE
      const productId = 2;
      const mockProduct = {
        id: 2,
        name: 'MacBook Pro',
        description: 'Professional laptop',
        price: 300000,
        stock: 1,
        isAvailable: () => true,
      };

      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.success({ product: mockProduct })
      );

      // ⚡ ACT
      const result = await service.getProductById(productId);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data!.product.name).toBe('MacBook Pro');
    });
  });

  describe('validateProductAvailability', () => {
    it('should validate available product successfully', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      const mockProduct = {
        id: 1,
        name: 'Available Product',
        description: 'In stock',
        price: 75000,
        stock: 5,
        isAvailable: () => true,
      };

      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.success({ product: mockProduct })
      );

      // ⚡ ACT
      const result = await service.validateProductAvailability(productId);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data!.isAvailable).toBe(true);
      expect(result.data!.product).toEqual(mockProduct);
    });

    it('should validate unavailable product successfully', async () => {
      // 🏗️ ARRANGE
      const productId = 2;
      const mockProduct = {
        id: 2,
        name: 'Out of Stock Product',
        description: 'No stock',
        price: 50000,
        stock: 0,
        isAvailable: () => false, // Not available
      };

      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.success({ product: mockProduct })
      );

      // ⚡ ACT
      const result = await service.validateProductAvailability(productId);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data!.isAvailable).toBe(false);
      expect(result.data!.product).toBeUndefined(); // Should not include product if unavailable
    });

    it('should handle product not found during availability validation', async () => {
      // 🏗️ ARRANGE
      const productId = 999;
      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.failure(new Error('Product with ID 999 not found'))
      );

      // ⚡ ACT
      const result = await service.validateProductAvailability(productId);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product with ID 999 not found');
    });

    it('should handle unexpected errors during availability validation', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      mockGetProductsUseCase.executeGetById.mockRejectedValue(new Error('Database error'));

      // ⚡ ACT
      const result = await service.validateProductAvailability(productId);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while getting product');
    });

    it('should handle product with complex availability logic', async () => {
      // 🏗️ ARRANGE
      const productId = 3;
      const mockProduct = {
        id: 3,
        name: 'Limited Product',
        description: 'Limited availability',
        price: 200000,
        stock: 1,
        isAvailable: () => true, // Available but limited
      };

      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.success({ product: mockProduct })
      );

      // ⚡ ACT
      const result = await service.validateProductAvailability(productId);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data!.isAvailable).toBe(true);
      expect(result.data!.product).toEqual(mockProduct);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle null product response gracefully', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      // Simular respuesta exitosa pero con producto null/undefined
      mockGetProductsUseCase.executeGetById.mockResolvedValue(
        Result.success({ product: null })
      );

      // ⚡ ACT
      const result = await service.validateProductAvailability(productId);

      // ✅ ASSERT
      // Esto podría causar error al llamar isAvailable(), que está bien para testing
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while getting product');
    });

    it('should handle multiple concurrent requests', async () => {
      // 🏗️ ARRANGE
      const mockProducts = [
        { id: 1, name: 'Product 1', isAvailable: () => true },
        { id: 2, name: 'Product 2', isAvailable: () => false },
        { id: 3, name: 'Product 3', isAvailable: () => true },
      ];

      // Mock responses for each call
      mockGetProductsUseCase.executeGetById
        .mockResolvedValueOnce(Result.success({ product: mockProducts[0] }))
        .mockResolvedValueOnce(Result.success({ product: mockProducts[1] }))
        .mockResolvedValueOnce(Result.success({ product: mockProducts[2] }));

      // ⚡ ACT
      const promises = [
        service.validateProductAvailability(1),
        service.validateProductAvailability(2),
        service.validateProductAvailability(3),
      ];

      const results = await Promise.all(promises);

      // ✅ ASSERT
      expect(results[0].success).toBe(true);
      expect(results[0].data!.isAvailable).toBe(true);
      
      expect(results[1].success).toBe(true);
      expect(results[1].data!.isAvailable).toBe(false);
      
      expect(results[2].success).toBe(true);
      expect(results[2].data!.isAvailable).toBe(true);
    });

    it('should call use case methods correctly in all scenarios', async () => {
      // Test para asegurar que todos los métodos del use case se llaman correctamente
      
      // Test getProducts
      mockGetProductsUseCase.execute.mockResolvedValue(Result.success({ products: [], total: 0, hasMore: false }));
      await service.getProducts({ limit: 5 });
      expect(mockGetProductsUseCase.execute).toHaveBeenCalledWith({ limit: 5 });

      // Test getProductById
      const mockProduct = { id: 1, name: 'Test', isAvailable: () => true };
      mockGetProductsUseCase.executeGetById.mockResolvedValue(Result.success({ product: mockProduct }));
      await service.getProductById(1);
      expect(mockGetProductsUseCase.executeGetById).toHaveBeenCalledWith({ productId: 1 });

      // Test validateProductAvailability (which internally calls getProductById)
      await service.validateProductAvailability(1);
      expect(mockGetProductsUseCase.executeGetById).toHaveBeenCalledWith({ productId: 1 });
    });
  });

  describe('Error Message Handling', () => {
    it('should properly handle different error types in getProducts', async () => {
      const errorScenarios = [
        { error: new Error('Validation failed'), expected: 'Validation failed' },
        { error: new Error(''), expected: 'Failed to get products' },
        { error: null, expected: 'Failed to get products' },
      ];

      for (const scenario of errorScenarios) {
        mockGetProductsUseCase.execute.mockResolvedValue(Result.failure(scenario.error));
        const result = await service.getProducts();
        expect(result.success).toBe(false);
        expect(result.error).toBe(scenario.expected);
      }
    });

    it('should properly handle different error types in getProductById', async () => {
      const errorScenarios = [
        { error: new Error('Product not found'), expected: 'Product not found' },
        { error: new Error(''), expected: 'Failed to get product' },
        { error: null, expected: 'Failed to get product' },
      ];

      for (const scenario of errorScenarios) {
        mockGetProductsUseCase.executeGetById.mockResolvedValue(Result.failure(scenario.error));
        const result = await service.getProductById(1);
        expect(result.success).toBe(false);
        expect(result.error).toBe(scenario.expected);
      }
    });
  });
});