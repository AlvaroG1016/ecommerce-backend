import { Test, TestingModule } from '@nestjs/testing';
import { Delivery, DeliveryStatus } from 'src/domain/entities/delivery.entity';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { PrismaDeliveryRepository } from 'src/infrastructure/database/repositories/prisma-delivery.repository';


// Mock interface para PrismaService
interface MockPrismaService {
  delivery: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
}

describe('PrismaDeliveryRepository', () => {
  let repository: PrismaDeliveryRepository;
  let prismaService: MockPrismaService;

  const mockPrismaDelivery = {
    id: 1,
    transactionId: 101,
    address: '123 Main Street',
    city: 'Bogotá',
    postalCode: '110111',
    phone: '3001234567',
    deliveryFee: 5000,
    status: DeliveryStatus.PENDING,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockPrismaService: MockPrismaService = {
      delivery: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaDeliveryRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaDeliveryRepository>(PrismaDeliveryRepository);
    prismaService = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all deliveries ordered by createdAt desc', async () => {
      // Arrange
      const mockDeliveries = [mockPrismaDelivery];
      prismaService.delivery.findMany.mockResolvedValue(mockDeliveries);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(prismaService.delivery.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Delivery);
      expect(result[0].address).toBe('123 Main Street');
      expect(result[0].status).toBe(DeliveryStatus.PENDING);
    });

    it('should return empty array when no deliveries exist', async () => {
      // Arrange
      prismaService.delivery.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return delivery when found', async () => {
      // Arrange
      prismaService.delivery.findUnique.mockResolvedValue(mockPrismaDelivery);

      // Act
      const result = await repository.findById(1);

      // Assert
      expect(prismaService.delivery.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeInstanceOf(Delivery);
      expect(result?.id).toBe(1);
      expect(result?.transactionId).toBe(101);
    });

    it('should return null when delivery not found', async () => {
      // Arrange
      prismaService.delivery.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('should return delivery when found', async () => {
      // Arrange
      prismaService.delivery.findUnique.mockResolvedValue(mockPrismaDelivery);

      // Act
      const result = await repository.findByIdOrFail(1);

      // Assert
      expect(result).toBeInstanceOf(Delivery);
      expect(result.id).toBe(1);
    });

    it('should throw error when delivery not found', async () => {
      // Arrange
      prismaService.delivery.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.findByIdOrFail(999)).rejects.toThrow(
        'Delivery with ID 999 not found'
      );
    });
  });

  describe('findByTransactionId', () => {
    it('should return delivery when found by transaction id', async () => {
      // Arrange
      prismaService.delivery.findUnique.mockResolvedValue(mockPrismaDelivery);

      // Act
      const result = await repository.findByTransactionId(101);

      // Assert
      expect(prismaService.delivery.findUnique).toHaveBeenCalledWith({
        where: { transactionId: 101 },
      });
      expect(result).toBeInstanceOf(Delivery);
      expect(result?.transactionId).toBe(101);
    });

    it('should return null when delivery not found by transaction id', async () => {
      // Arrange
      prismaService.delivery.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByTransactionId(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should return deliveries filtered by status', async () => {
      // Arrange
      const pendingDeliveries = [
        mockPrismaDelivery,
        { ...mockPrismaDelivery, id: 2, transactionId: 102 }
      ];
      prismaService.delivery.findMany.mockResolvedValue(pendingDeliveries);

      // Act
      const result = await repository.findByStatus(DeliveryStatus.PENDING);

      // Assert
      expect(prismaService.delivery.findMany).toHaveBeenCalledWith({
        where: { status: DeliveryStatus.PENDING },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Delivery);
      expect(result[0].status).toBe(DeliveryStatus.PENDING);
    });

    it('should return empty array when no deliveries with specified status', async () => {
      // Arrange
      prismaService.delivery.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByStatus(DeliveryStatus.DELIVERED);

      // Assert
      expect(result).toEqual([]);
    });

    it('should work with different delivery statuses', async () => {
      // Arrange
      const deliveredDelivery = { ...mockPrismaDelivery, status: DeliveryStatus.DELIVERED };
      prismaService.delivery.findMany.mockResolvedValue([deliveredDelivery]);

      // Act
      const result = await repository.findByStatus(DeliveryStatus.DELIVERED);

      // Assert
      expect(prismaService.delivery.findMany).toHaveBeenCalledWith({
        where: { status: DeliveryStatus.DELIVERED },
        orderBy: { createdAt: 'desc' },
      });
      expect(result[0].status).toBe(DeliveryStatus.DELIVERED);
    });
  });

  describe('save', () => {
    describe('creating new delivery', () => {
      it('should create new delivery when id is 0', async () => {
        // Arrange
        const newDelivery = Delivery.fromPersistence({
          id: 0,
          transactionId: 201,
          address: '456 Oak Avenue',
          city: 'Medellín',
          postalCode: '050001',
          phone: '3009876543',
          deliveryFee: 7500,
          status: DeliveryStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const createdDelivery = {
          id: 2,
          transactionId: 201,
          address: '456 Oak Avenue',
          city: 'Medellín',
          postalCode: '050001',
          phone: '3009876543',
          deliveryFee: 7500,
          status: DeliveryStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.delivery.create.mockResolvedValue(createdDelivery);

        // Act
        const result = await repository.save(newDelivery);

        // Assert
        expect(prismaService.delivery.create).toHaveBeenCalledWith({
          data: {
            transactionId: 201,
            address: '456 Oak Avenue',
            city: 'Medellín',
            postalCode: '050001',
            phone: '3009876543',
            deliveryFee: 7500,
            status: DeliveryStatus.PENDING,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
        expect(result).toBeInstanceOf(Delivery);
        expect(result.id).toBe(2);
      });
    });

    describe('updating existing delivery', () => {
      it('should update existing delivery when id > 0', async () => {
        // Arrange
        const existingDelivery = Delivery.fromPersistence({
          id: 1,
          transactionId: 101,
          address: 'Updated Address',
          city: 'Updated City',
          postalCode: '111111',
          phone: '3001111111',
          deliveryFee: 6000,
          status: DeliveryStatus.DELIVERED,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const updatedDelivery = {
          id: 1,
          transactionId: 101,
          address: 'Updated Address',
          city: 'Updated City',
          postalCode: '111111',
          phone: '3001111111',
          deliveryFee: 6000,
          status: DeliveryStatus.DELIVERED,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.delivery.update.mockResolvedValue(updatedDelivery);

        // Act
        const result = await repository.save(existingDelivery);

        // Assert
        expect(prismaService.delivery.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            id: 1,
            transactionId: 101,
            address: 'Updated Address',
            city: 'Updated City',
            postalCode: '111111',
            phone: '3001111111',
            deliveryFee: 6000,
            status: DeliveryStatus.DELIVERED,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
        expect(result).toBeInstanceOf(Delivery);
      });
    });
  });

  describe('update', () => {
    it('should update delivery with specific id', async () => {
      // Arrange
      const deliveryToUpdate = Delivery.fromPersistence({
        id: 5, // Este id será ignorado porque se usa el parámetro
        transactionId: 101,
        address: 'New Address',
        city: 'New City',
        postalCode: '222222',
        phone: '3002222222',
        deliveryFee: 8000,
        status: DeliveryStatus.DELIVERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedDelivery = {
        id: 3, // Se usa este id del parámetro
        transactionId: 101,
        address: 'New Address',
        city: 'New City',
        postalCode: '222222',
        phone: '3002222222',
        deliveryFee: 8000,
        status: DeliveryStatus.DELIVERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.delivery.update.mockResolvedValue(updatedDelivery);

      // Act
      const result = await repository.update(3, deliveryToUpdate);

      // Assert
      expect(prismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: {
          id: 5,
          transactionId: 101,
          address: 'New Address',
          city: 'New City',
          postalCode: '222222',
          phone: '3002222222',
          deliveryFee: 8000,
          status: DeliveryStatus.DELIVERED,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toBeInstanceOf(Delivery);
      expect(result.id).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete delivery by id', async () => {
      // Arrange
      prismaService.delivery.delete.mockResolvedValue(mockPrismaDelivery);

      // Act
      await repository.delete(1);

      // Assert
      expect(prismaService.delivery.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('private methods coverage', () => {
    it('should test toDomain conversion with number parsing', async () => {
      // Arrange - deliveryFee as string to test Number() conversion
      const prismaDeliveryWithStringFee = {
        ...mockPrismaDelivery,
        deliveryFee: '5000', // String instead of number
      };
      prismaService.delivery.findUnique.mockResolvedValue(prismaDeliveryWithStringFee);

      // Act
      const result = await repository.findById(1);

      // Assert - toDomain converts string to number
      expect(result?.deliveryFee).toBe(5000);
      expect(typeof result?.deliveryFee).toBe('number');
    });

    it('should test toPersistence conversion through save method', async () => {
      // Arrange
      const delivery = Delivery.fromPersistence({
        id: 1,
        transactionId: 101,
        address: 'Test Address',
        city: 'Test City',
        postalCode: '123456',
        phone: '3001234567',
        deliveryFee: 5000,
        status: DeliveryStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaService.delivery.update.mockResolvedValue(mockPrismaDelivery);

      // Act
      await repository.save(delivery);

      // Assert - Verifies toPersistence method is working
      expect(prismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          id: 1,
          transactionId: 101,
          address: 'Test Address',
          city: 'Test City',
          postalCode: '123456',
          phone: '3001234567',
          deliveryFee: 5000,
          status: DeliveryStatus.PENDING,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should handle all delivery statuses', async () => {
      // Test para asegurar que todos los status de DeliveryStatus funcionan
      const statuses = [
        DeliveryStatus.PENDING,
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.DELIVERED,
        
      ];

      for (const status of statuses) {
        const deliveryWithStatus = { ...mockPrismaDelivery, status };
        prismaService.delivery.findMany.mockResolvedValue([deliveryWithStatus]);

        const result = await repository.findByStatus(status);

        expect(result[0].status).toBe(status);
      }
    });
  });
});