// test/unit/infrastructure/web/controllers/product.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../../../../../src/infrastructure/web/controllers/product.controller';
import { ProductApplicationService } from '../../../../../src/application/services/product-application.service';
import { ResponseBuilderService } from '../../../../../src/application/services/response-builder.service';

// 🎭 MOCKS
const mockProductApplicationService = {
  getProducts: jest.fn(),
  getProductById: jest.fn(),
};

const mockResponseBuilderService = {
  buildSuccess: jest.fn(),
  buildError: jest.fn(),
  buildUnexpectedError: jest.fn(),
};

describe('ProductController', () => {
  let controller: ProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        { provide: ProductApplicationService, useValue: mockProductApplicationService },
        { provide: ResponseBuilderService, useValue: mockResponseBuilderService },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should get products successfully with default parameters', async () => {
      // 🏗️ ARRANGE
      const queryParams = {}; // Empty query params

      const mockServiceResponse = {
        success: true,
        data: {
          products: [
            {
              id: 1,
              name: 'iPhone 14',
              description: 'Latest iPhone',
              price: 100000,
              baseFee: 5000,
              stock: 10,
              imageUrl: 'https://img.jpg',
              isActive: true,
              isAvailable: () => true,
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-01-02'),
            },
            {
              id: 2,
              name: 'Samsung Galaxy',
              description: 'Android phone',
              price: 80000,
              baseFee: 4000,
              stock: 5,
              imageUrl: 'https://img2.jpg',
              isActive: true,
              isAvailable: () => true,
              createdAt: new Date('2023-01-03'),
              updatedAt: new Date('2023-01-04'),
            },
          ],
          total: 2,
          hasMore: false,
        },
      };

      const mockBuilderResponse = {
        success: true,
        data: {
          products: [
            {
              id: 1,
              name: 'iPhone 14',
              description: 'Latest iPhone',
              price: 100000,
              baseFee: 5000,
              stock: 10,
              imageUrl: 'https://img.jpg',
              isActive: true,
              isAvailable: true,
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-01-02'),
            },
            {
              id: 2,
              name: 'Samsung Galaxy',
              description: 'Android phone',
              price: 80000,
              baseFee: 4000,
              stock: 5,
              imageUrl: 'https://img2.jpg',
              isActive: true,
              isAvailable: true,
              createdAt: new Date('2023-01-03'),
              updatedAt: new Date('2023-01-04'),
            },
          ],
          pagination: {
            total: 2,
            hasMore: false,
            limit: undefined,
            offset: undefined,
          },
        },
        message: 'Retrieved 2 products successfully',
      };

      mockProductApplicationService.getProducts.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue(mockBuilderResponse);

      // ⚡ ACT
      const result = await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(result).toEqual(mockBuilderResponse);
      expect(mockProductApplicationService.getProducts).toHaveBeenCalledWith({
        availableOnly: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        {
          products: [
            {
              id: 1,
              name: 'iPhone 14',
              description: 'Latest iPhone',
              price: 100000,
              baseFee: 5000,
              stock: 10,
              imageUrl: 'https://img.jpg',
              isActive: true,
              isAvailable: true,
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-01-02'),
            },
            {
              id: 2,
              name: 'Samsung Galaxy',
              description: 'Android phone',
              price: 80000,
              baseFee: 4000,
              stock: 5,
              imageUrl: 'https://img2.jpg',
              isActive: true,
              isAvailable: true,
              createdAt: new Date('2023-01-03'),
              updatedAt: new Date('2023-01-04'),
            },
          ],
          pagination: {
            total: 2,
            hasMore: false,
            limit: undefined,
            offset: undefined,
          },
        },
        'Retrieved 2 products successfully',
        {
          nextStep: 'DISPLAY_PRODUCTS',
          recommendation: 'Products ready for display',
        }
      );
    });

    it('should get products successfully with query parameters', async () => {
      // 🏗️ ARRANGE
      const queryParams = {
        availableOnly: true,
        limit: 10,
        offset: 0,
      };

      const mockServiceResponse = {
        success: true,
        data: {
          products: [
            {
              id: 1,
              name: 'Available Product',
              description: 'In stock product',
              price: 50000,
              baseFee: 2500,
              stock: 20,
              imageUrl: 'https://available.jpg',
              isActive: true,
              isAvailable: () => true,
              createdAt: new Date('2023-02-01'),
              updatedAt: new Date('2023-02-02'),
            },
          ],
          total: 15,
          hasMore: true,
        },
      };

      mockProductApplicationService.getProducts.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue({
        success: true,
        data: expect.any(Object),
      });

      // ⚡ ACT
      const result = await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(mockProductApplicationService.getProducts).toHaveBeenCalledWith({
        availableOnly: true,
        limit: 10,
        offset: 0,
      });
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          products: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              name: 'Available Product',
              isAvailable: true,
            }),
          ]),
          pagination: {
            total: 15,
            hasMore: true,
            limit: 10,
            offset: 0,
          },
        }),
        'Retrieved 1 products successfully',
        {
          nextStep: 'DISPLAY_PRODUCTS',
          recommendation: 'Products ready for display',
        }
      );
    });

    it('should handle empty products list', async () => {
      // 🏗️ ARRANGE
      const queryParams = { availableOnly: true };

      const mockServiceResponse = {
        success: true,
        data: {
          products: [],
          total: 0,
          hasMore: false,
        },
      };

      mockProductApplicationService.getProducts.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue({
        success: true,
        data: { products: [], pagination: { total: 0 } },
      });

      // ⚡ ACT
      const result = await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [],
          pagination: expect.objectContaining({ total: 0 }),
        }),
        'Retrieved 0 products successfully',
        expect.any(Object)
      );
    });

    it('should handle service failure', async () => {
      // 🏗️ ARRANGE
      const queryParams = {};
      const mockServiceResponse = {
        success: false,
        error: 'Database connection failed',
      };

      const mockBuilderResponse = {
        success: false,
        error: 'Product retrieval failed',
      };

      mockProductApplicationService.getProducts.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildError.mockReturnValue(mockBuilderResponse);

      // ⚡ ACT
      const result = await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(result).toEqual(mockBuilderResponse);
      expect(mockResponseBuilderService.buildError).toHaveBeenCalledWith(
        'Database connection failed',
        'Product retrieval failed',
        'PRODUCT_RETRIEVAL_FAILED',
        {
          nextStep: 'RETRY_REQUEST',
          recommendation: 'Please check your query parameters and try again',
        }
      );
    });

    it('should handle unexpected errors', async () => {
      // 🏗️ ARRANGE
      const queryParams = {};
      const mockBuilderResponse = {
        success: false,
        error: 'Unexpected error occurred',
      };

      mockProductApplicationService.getProducts.mockRejectedValue(
        new Error('Unexpected system error')
      );
      mockResponseBuilderService.buildUnexpectedError.mockReturnValue(mockBuilderResponse);

      // ⚡ ACT
      const result = await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(result).toEqual(mockBuilderResponse);
      expect(mockResponseBuilderService.buildUnexpectedError).toHaveBeenCalledWith(
        expect.any(Error),
        'ProductController.getProducts'
      );
    });

    it('should handle products with decimal prices correctly', async () => {
      // 🏗️ ARRANGE
      const queryParams = {};

      // Mock product with Decimal-like price object
      const mockProductWithDecimal = {
        id: 1,
        name: 'Expensive Product',
        description: 'High-end item',
        price: { toString: () => '999999.99' }, // Simulating Decimal object
        baseFee: { toString: () => '10000.50' }, // Simulating Decimal object
        stock: 1,
        imageUrl: 'https://expensive.jpg',
        isActive: true,
        isAvailable: () => true,
        createdAt: new Date('2023-03-01'),
        updatedAt: new Date('2023-03-02'),
      };

      const mockServiceResponse = {
        success: true,
        data: {
          products: [mockProductWithDecimal],
          total: 1,
          hasMore: false,
        },
      };

      mockProductApplicationService.getProducts.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue({ success: true });

      // ⚡ ACT
      await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          products: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              price: 999999.99, // Should be converted to number
              baseFee: 10000.5, // Should be converted to number
            }),
          ]),
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle products with null/undefined prices', async () => {
      // 🏗️ ARRANGE
      const queryParams = {};

      const mockProductWithNullPrice = {
        id: 1,
        name: 'Free Product',
        description: 'No price set',
        price: null,
        baseFee: undefined,
        stock: 100,
        imageUrl: 'https://free.jpg',
        isActive: true,
        isAvailable: () => true,
        createdAt: new Date('2023-04-01'),
        updatedAt: new Date('2023-04-02'),
      };

      const mockServiceResponse = {
        success: true,
        data: {
          products: [mockProductWithNullPrice],
          total: 1,
          hasMore: false,
        },
      };

      mockProductApplicationService.getProducts.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue({ success: true });

      // ⚡ ACT
      await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          products: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              price: 0, // Should default to 0
              baseFee: 0, // Should default to 0
            }),
          ]),
        }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('getProductById', () => {
    it('should get product by ID successfully', async () => {
      // 🏗️ ARRANGE
      const productId = 1;

      const mockProduct = {
        id: 1,
        name: 'iPhone 14 Pro',
        description: 'Premium iPhone model',
        price: 150000,
        baseFee: 7500,
        stock: 3,
        imageUrl: 'https://iphone14pro.jpg',
        isActive: true,
        isAvailable: () => true,
        createdAt: new Date('2023-05-01'),
        updatedAt: new Date('2023-05-02'),
      };

      const mockServiceResponse = {
        success: true,
        data: { product: mockProduct },
      };

      const mockBuilderResponse = {
        success: true,
        data: {
          id: 1,
          name: 'iPhone 14 Pro',
          description: 'Premium iPhone model',
          price: 150000,
          baseFee: 7500,
          stock: 3,
          imageUrl: 'https://iphone14pro.jpg',
          isActive: true,
          isAvailable: true,
          createdAt: new Date('2023-05-01'),
          updatedAt: new Date('2023-05-02'),
        },
        message: 'Product iPhone 14 Pro retrieved successfully',
      };

      mockProductApplicationService.getProductById.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue(mockBuilderResponse);

      // ⚡ ACT
      const result = await controller.getProductById(productId);

      // ✅ ASSERT
      expect(result).toEqual(mockBuilderResponse);
      expect(mockProductApplicationService.getProductById).toHaveBeenCalledWith(1);
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        {
          id: 1,
          name: 'iPhone 14 Pro',
          description: 'Premium iPhone model',
          price: 150000,
          baseFee: 7500,
          stock: 3,
          imageUrl: 'https://iphone14pro.jpg',
          isActive: true,
          isAvailable: true,
          createdAt: new Date('2023-05-01'),
          updatedAt: new Date('2023-05-02'),
        },
        'Product iPhone 14 Pro retrieved successfully',
        {
          nextStep: 'DISPLAY_PRODUCT',
          recommendation: 'Product ready for display or purchase',
        }
      );
    });

    it('should handle product not found', async () => {
      // 🏗️ ARRANGE
      const productId = 999;
      const mockServiceResponse = {
        success: false,
        error: 'Product with ID 999 not found',
      };

      const mockBuilderResponse = {
        success: false,
        error: 'Product not found',
      };

      mockProductApplicationService.getProductById.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildError.mockReturnValue(mockBuilderResponse);

      // ⚡ ACT
      const result = await controller.getProductById(productId);

      // ✅ ASSERT
      expect(result).toEqual(mockBuilderResponse);
      expect(mockResponseBuilderService.buildError).toHaveBeenCalledWith(
        'Product with ID 999 not found',
        'Product retrieval failed for ID 999',
        'PRODUCT_NOT_FOUND',
        {
          nextStep: 'CHECK_PRODUCT_ID',
          recommendation: 'Please verify the product ID and try again',
        }
      );
    });

    it('should handle general service error', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      const mockServiceResponse = {
        success: false,
        error: 'Database connection timeout',
      };

      const mockBuilderResponse = {
        success: false,
        error: 'Service error',
      };

      mockProductApplicationService.getProductById.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildError.mockReturnValue(mockBuilderResponse);

      // ⚡ ACT
      const result = await controller.getProductById(productId);

      // ✅ ASSERT
      expect(mockResponseBuilderService.buildError).toHaveBeenCalledWith(
        'Database connection timeout',
        'Product retrieval failed for ID 1',
        'PRODUCT_RETRIEVAL_FAILED',
        {
          nextStep: 'RETRY_REQUEST',
          recommendation: 'Please try again later',
        }
      );
    });

    it('should handle unexpected errors in getProductById', async () => {
      // 🏗️ ARRANGE
      const productId = 1;
      const mockBuilderResponse = {
        success: false,
        error: 'Unexpected error occurred',
      };

      mockProductApplicationService.getProductById.mockRejectedValue(
        new Error('System crash')
      );
      mockResponseBuilderService.buildUnexpectedError.mockReturnValue(mockBuilderResponse);

      // ⚡ ACT
      const result = await controller.getProductById(productId);

      // ✅ ASSERT
      expect(result).toEqual(mockBuilderResponse);
      expect(mockResponseBuilderService.buildUnexpectedError).toHaveBeenCalledWith(
        expect.any(Error),
        'ProductController.getProductById',
        { productId: 1 }
      );
    });

    it('should handle product with decimal prices in getProductById', async () => {
      // 🏗️ ARRANGE
      const productId = 1;

      const mockProductWithDecimal = {
        id: 1,
        name: 'Luxury Item',
        description: 'High-end product',
        price: { toString: () => '2500000.75' },
        baseFee: { toString: () => '125000.25' },
        stock: 1,
        imageUrl: 'https://luxury.jpg',
        isActive: true,
        isAvailable: () => true,
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date('2023-06-02'),
      };

      const mockServiceResponse = {
        success: true,
        data: { product: mockProductWithDecimal },
      };

      mockProductApplicationService.getProductById.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue({ success: true });

      // ⚡ ACT
      await controller.getProductById(productId);

      // ✅ ASSERT
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          price: 2500000.75,
          baseFee: 125000.25,
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle unavailable product correctly', async () => {
      // 🏗️ ARRANGE
      const productId = 1;

      const mockUnavailableProduct = {
        id: 1,
        name: 'Out of Stock Product',
        description: 'Currently unavailable',
        price: 75000,
        baseFee: 3750,
        stock: 0,
        imageUrl: 'https://outofstock.jpg',
        isActive: false,
        isAvailable: () => false, // Not available
        createdAt: new Date('2023-07-01'),
        updatedAt: new Date('2023-07-02'),
      };

      const mockServiceResponse = {
        success: true,
        data: { product: mockUnavailableProduct },
      };

      mockProductApplicationService.getProductById.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue({ success: true });

      // ⚡ ACT
      await controller.getProductById(productId);

      // ✅ ASSERT
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          isActive: false,
          isAvailable: false,
          stock: 0,
        }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform all product properties', async () => {
      // 🏗️ ARRANGE
      const queryParams = {};

      const mockProductWithAllProperties = {
        id: 42,
        name: 'Complete Product',
        description: 'Product with all properties',
        price: 123456,
        baseFee: 6789,
        stock: 15,
        imageUrl: 'https://complete.jpg',
        isActive: true,
        isAvailable: () => true,
        createdAt: new Date('2023-08-01T10:30:00Z'),
        updatedAt: new Date('2023-08-15T14:45:00Z'),
      };

      const mockServiceResponse = {
        success: true,
        data: {
          products: [mockProductWithAllProperties],
          total: 1,
          hasMore: false,
        },
      };

      mockProductApplicationService.getProducts.mockResolvedValue(mockServiceResponse);
      mockResponseBuilderService.buildSuccess.mockReturnValue({ success: true });

      // ⚡ ACT
      await controller.getProducts(queryParams);

      // ✅ ASSERT
      expect(mockResponseBuilderService.buildSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [
            {
              id: 42,
              name: 'Complete Product',
              description: 'Product with all properties',
              price: 123456,
              baseFee: 6789,
              stock: 15,
              imageUrl: 'https://complete.jpg',
              isActive: true,
              isAvailable: true,
              createdAt: new Date('2023-08-01T10:30:00Z'),
              updatedAt: new Date('2023-08-15T14:45:00Z'),
            },
          ],
          pagination: expect.objectContaining({
            total: 1,
            hasMore: false,
          }),
        }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });
});