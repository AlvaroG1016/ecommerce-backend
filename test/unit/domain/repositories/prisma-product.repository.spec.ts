import { Test, TestingModule } from '@nestjs/testing';
import { Product } from 'src/domain/entities/product.entity';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { PrismaProductRepository } from 'src/infrastructure/database/repositories/prisma-product.repository';


// Mock interface para PrismaService
interface MockPrismaService {
  product: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
}

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;
  let prismaService: MockPrismaService;

  const mockPrismaProduct = {
    id: 1,
    name: 'Test Product',
    description: 'A test product description',
    price: 25000,
    stock: 100,
    imageUrl: 'https://example.com/product.jpg',
    baseFee: 2500,
    isActive: true,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockPrismaService: MockPrismaService = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaProductRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaProductRepository>(PrismaProductRepository);
    prismaService = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all products ordered by createdAt desc', async () => {
      // Arrange
      const mockProducts = [mockPrismaProduct];
      prismaService.product.findMany.mockResolvedValue(mockProducts);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Product);
      expect(result[0].name).toBe('Test Product');
      expect(result[0].price).toBe(25000);
    });

    it('should return empty array when no products exist', async () => {
      // Arrange
      prismaService.product.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      // Arrange
      prismaService.product.findUnique.mockResolvedValue(mockPrismaProduct);

      // Act
      const result = await repository.findById(1);

      // Assert
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeInstanceOf(Product);
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test Product');
    });

    it('should return null when product not found', async () => {
      // Arrange
      prismaService.product.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('should return product when found', async () => {
      // Arrange
      prismaService.product.findUnique.mockResolvedValue(mockPrismaProduct);

      // Act
      const result = await repository.findByIdOrFail(1);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(result.id).toBe(1);
    });

    it('should throw error when product not found', async () => {
      // Arrange
      prismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.findByIdOrFail(999)).rejects.toThrow(
        'Product with ID 999 not found'
      );
    });
  });

  describe('findAvailable', () => {
    it('should return only active products with stock > 0', async () => {
      // Arrange
      const availableProducts = [
        mockPrismaProduct,
        { ...mockPrismaProduct, id: 2, name: 'Another Product', stock: 50 }
      ];
      prismaService.product.findMany.mockResolvedValue(availableProducts);

      // Act
      const result = await repository.findAvailable();

      // Assert
      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          stock: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Product);
      expect(result[0].isActive).toBe(true);
      expect(result[0].stock).toBeGreaterThan(0);
    });

    it('should return empty array when no available products', async () => {
      // Arrange
      prismaService.product.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAvailable();

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter out inactive products and products with no stock', async () => {
      // Arrange - Este test verifica que la consulta se hace correctamente
      prismaService.product.findMany.mockResolvedValue([]);

      // Act
      await repository.findAvailable();

      // Assert - Verifica que los filtros se aplican correctamente
      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          stock: { gt: 0 },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateStock', () => {
    it('should update product stock and return updated product', async () => {
      // Arrange
      const updatedProduct = { ...mockPrismaProduct, stock: 75 };
      prismaService.product.update.mockResolvedValue(updatedProduct);

      // Act
      const result = await repository.updateStock(1, 75);

      // Assert
      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          stock: 75,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toBeInstanceOf(Product);
      expect(result.stock).toBe(75);
    });

    it('should handle stock update to zero', async () => {
      // Arrange
      const outOfStockProduct = { ...mockPrismaProduct, stock: 0 };
      prismaService.product.update.mockResolvedValue(outOfStockProduct);

      // Act
      const result = await repository.updateStock(1, 0);

      // Assert
      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          stock: 0,
          updatedAt: expect.any(Date),
        },
      });
      expect(result.stock).toBe(0);
    });

    it('should handle negative stock values', async () => {
      // Arrange
      const negativeStockProduct = { ...mockPrismaProduct, stock: -5 };
      prismaService.product.update.mockResolvedValue(negativeStockProduct);

      // Act
      const result = await repository.updateStock(1, -5);

      // Assert
      expect(result.stock).toBe(-5);
    });
  });

  describe('save', () => {
    describe('creating new product', () => {
      it('should create new product when id is 0', async () => {
        // Arrange
        const newProduct = Product.fromPersistence({
          id: 0,
          name: 'New Product',
          description: 'New product description',
          price: 35000,
          stock: 200,
          imageUrl: 'https://example.com/new-product.jpg',
          baseFee: 3500,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const createdProduct = {
          id: 2,
          name: 'New Product',
          description: 'New product description',
          price: 35000,
          stock: 200,
          imageUrl: 'https://example.com/new-product.jpg',
          baseFee: 3500,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.product.create.mockResolvedValue(createdProduct);

        // Act
        const result = await repository.save(newProduct);

        // Assert
        expect(prismaService.product.create).toHaveBeenCalledWith({
          data: {
            name: 'New Product',
            description: 'New product description',
            price: 35000,
            stock: 200,
            imageUrl: 'https://example.com/new-product.jpg',
            baseFee: 3500,
            isActive: true,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
        expect(result).toBeInstanceOf(Product);
        expect(result.id).toBe(2);
      });
    });

    describe('updating existing product', () => {
      it('should update existing product when id > 0', async () => {
        // Arrange
        const existingProduct = Product.fromPersistence({
          id: 1,
          name: 'Updated Product',
          description: 'Updated description',
          price: 30000,
          stock: 150,
          imageUrl: 'https://example.com/updated-product.jpg',
          baseFee: 3000,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const updatedProduct = {
          id: 1,
          name: 'Updated Product',
          description: 'Updated description',
          price: 30000,
          stock: 150,
          imageUrl: 'https://example.com/updated-product.jpg',
          baseFee: 3000,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.product.update.mockResolvedValue(updatedProduct);

        // Act
        const result = await repository.save(existingProduct);

        // Assert
        expect(prismaService.product.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            id: 1,
            name: 'Updated Product',
            description: 'Updated description',
            price: 30000,
            stock: 150,
            imageUrl: 'https://example.com/updated-product.jpg',
            baseFee: 3000,
            isActive: false,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
        expect(result).toBeInstanceOf(Product);
      });
    });
  });

  describe('delete', () => {
    it('should delete product by id', async () => {
      // Arrange
      prismaService.product.delete.mockResolvedValue(mockPrismaProduct);

      // Act
      await repository.delete(1);

      // Assert
      expect(prismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('private methods coverage', () => {
    it('should test toDomain conversion with null/undefined values', async () => {
      // Arrange - Prisma product with null description and imageUrl
      const prismaProductWithNulls = {
        ...mockPrismaProduct,
        description: null,
        imageUrl: null,
        price: '25000', // String to test Number() conversion
        baseFee: '2500', // String to test Number() conversion
      };
      prismaService.product.findUnique.mockResolvedValue(prismaProductWithNulls);

      // Act
      const result = await repository.findById(1);

      // Assert - toDomain handles null values and converts strings to numbers
      expect(result?.description).toBe('');
      expect(result?.imageUrl).toBe('');
      expect(result?.price).toBe(25000);
      expect(result?.baseFee).toBe(2500);
      expect(typeof result?.price).toBe('number');
      expect(typeof result?.baseFee).toBe('number');
    });

    it('should test toPersistence conversion through save method', async () => {
      // Arrange
      const product = Product.fromPersistence({
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        price: 25000,
        stock: 100,
        imageUrl: 'https://example.com/test.jpg',
        baseFee: 2500,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaService.product.update.mockResolvedValue(mockPrismaProduct);

      // Act
      await repository.save(product);

      // Assert - Verifies toPersistence method is working
      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          id: 1,
          name: 'Test Product',
          description: 'Test Description',
          price: 25000,
          stock: 100,
          imageUrl: 'https://example.com/test.jpg',
          baseFee: 2500,
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should handle boolean isActive values correctly', async () => {
      // Test both active and inactive products
      const activeProduct = { ...mockPrismaProduct, isActive: true };
      const inactiveProduct = { ...mockPrismaProduct, isActive: false };

      // Test active product
      prismaService.product.findUnique.mockResolvedValue(activeProduct);
      let result = await repository.findById(1);
      expect(result?.isActive).toBe(true);

      // Test inactive product
      prismaService.product.findUnique.mockResolvedValue(inactiveProduct);
      result = await repository.findById(1);
      expect(result?.isActive).toBe(false);
    });

    it('should handle different stock levels correctly', async () => {
      const productVariations = [
        { ...mockPrismaProduct, stock: 0 },
        { ...mockPrismaProduct, stock: 1 },
        { ...mockPrismaProduct, stock: 999999 },
      ];

      for (const productVariation of productVariations) {
        prismaService.product.findUnique.mockResolvedValue(productVariation);
        const result = await repository.findById(1);
        expect(result?.stock).toBe(productVariation.stock);
        expect(typeof result?.stock).toBe('number');
      }
    });
  });
});