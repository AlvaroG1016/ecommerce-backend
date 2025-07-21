import { Test, TestingModule } from '@nestjs/testing';
import { Transaction, TransactionStatus } from 'src/domain/entities/transaction.entity';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { PrismaTransactionRepository } from 'src/infrastructure/database/repositories/prisma-transaction.repository';

// Mock interface para PrismaService
interface MockPrismaService {
  transaction: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
}

describe('PrismaTransactionRepository', () => {
  let repository: PrismaTransactionRepository;
  let prismaService: MockPrismaService;

  const mockPrismaTransaction = {
    id: 1,
    customerId: 101,
    productId: 201,
    productAmount: 25000,
    baseFee: 2500,
    deliveryFee: 5000,
    totalAmount: 32500,
    status: TransactionStatus.PENDING,
    wompiTransactionId: 'wompi_123456',
    wompiReference: 'REF_789012',
    paymentMethod: 'CARD',
    cardLastFour: '1234',
    cardBrand: 'VISA',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: null,
    // Relaciones incluidas
    customer: {
      id: 101,
      name: 'John Doe',
      email: 'john@email.com',
    },
    product: {
      id: 201,
      name: 'Test Product',
      price: 25000,
    },
    delivery: {
      id: 301,
      address: '123 Main St',
      city: 'Bogotá',
    },
  };

  const includeRelations = {
    customer: true,
    product: true,
    delivery: true,
  };

  beforeEach(async () => {
    const mockPrismaService: MockPrismaService = {
      transaction: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaTransactionRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaTransactionRepository>(PrismaTransactionRepository);
    prismaService = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all transactions with relations ordered by createdAt desc', async () => {
      // Arrange
      const mockTransactions = [mockPrismaTransaction];
      prismaService.transaction.findMany.mockResolvedValue(mockTransactions);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(prismaService.transaction.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: includeRelations,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Transaction);
      expect(result[0].id).toBe(1);
      expect(result[0].customerId).toBe(101);
    });

    it('should return empty array when no transactions exist', async () => {
      // Arrange
      prismaService.transaction.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return transaction with relations when found', async () => {
      // Arrange
      prismaService.transaction.findUnique.mockResolvedValue(mockPrismaTransaction);

      // Act
      const result = await repository.findById(1);

      // Assert
      expect(prismaService.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: includeRelations,
      });
      expect(result).toBeInstanceOf(Transaction);
      expect(result?.id).toBe(1);
      expect(result?.wompiReference).toBe('REF_789012');
    });

    it('should return null when transaction not found', async () => {
      // Arrange
      prismaService.transaction.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('should return transaction when found', async () => {
      // Arrange
      prismaService.transaction.findUnique.mockResolvedValue(mockPrismaTransaction);

      // Act
      const result = await repository.findByIdOrFail(1);

      // Assert
      expect(result).toBeInstanceOf(Transaction);
      expect(result.id).toBe(1);
    });

    it('should throw error when transaction not found', async () => {
      // Arrange
      prismaService.transaction.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.findByIdOrFail(999)).rejects.toThrow(
        'Transaction with ID 999 not found'
      );
    });
  });

  describe('findByCustomerId', () => {
    it('should return transactions for specific customer', async () => {
      // Arrange
      const customerTransactions = [
        mockPrismaTransaction,
        { ...mockPrismaTransaction, id: 2, totalAmount: 45000 }
      ];
      prismaService.transaction.findMany.mockResolvedValue(customerTransactions);

      // Act
      const result = await repository.findByCustomerId(101);

      // Assert
      expect(prismaService.transaction.findMany).toHaveBeenCalledWith({
        where: { customerId: 101 },
        orderBy: { createdAt: 'desc' },
        include: includeRelations,
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Transaction);
      expect(result[0].customerId).toBe(101);
    });

    it('should return empty array when customer has no transactions', async () => {
      // Arrange
      prismaService.transaction.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByCustomerId(999);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return transactions filtered by status', async () => {
      // Arrange
      const pendingTransactions = [
        mockPrismaTransaction,
        { ...mockPrismaTransaction, id: 2, wompiReference: 'REF_234567' }
      ];
      prismaService.transaction.findMany.mockResolvedValue(pendingTransactions);

      // Act
      const result = await repository.findByStatus(TransactionStatus.PENDING);

      // Assert
      expect(prismaService.transaction.findMany).toHaveBeenCalledWith({
        where: { status: TransactionStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        include: includeRelations,
      });
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(TransactionStatus.PENDING);
    });

    it('should work with different transaction statuses', async () => {
      // Test para diferentes estados
      const statuses = [
        TransactionStatus.PENDING,
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
      ];

      for (const status of statuses) {
        const transactionWithStatus = { ...mockPrismaTransaction, status };
        prismaService.transaction.findMany.mockResolvedValue([transactionWithStatus]);

        const result = await repository.findByStatus(status);

        expect(prismaService.transaction.findMany).toHaveBeenCalledWith({
          where: { status },
          orderBy: { createdAt: 'desc' },
          include: includeRelations,
        });
        expect(result[0].status).toBe(status);
      }
    });

    it('should return empty array when no transactions with specified status', async () => {
      // Arrange
      prismaService.transaction.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByStatus(TransactionStatus.COMPLETED);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByWompiReference', () => {
    it('should return transaction when found by wompi reference', async () => {
      // Arrange
      prismaService.transaction.findFirst.mockResolvedValue(mockPrismaTransaction);

      // Act
      const result = await repository.findByWompiReference('REF_789012');

      // Assert
      expect(prismaService.transaction.findFirst).toHaveBeenCalledWith({
        where: { wompiReference: 'REF_789012' },
        include: includeRelations,
      });
      expect(result).toBeInstanceOf(Transaction);
      expect(result?.wompiReference).toBe('REF_789012');
    });

    it('should return null when transaction not found by wompi reference', async () => {
      // Arrange
      prismaService.transaction.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByWompiReference('NONEXISTENT_REF');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle different wompi reference formats', async () => {
      // Arrange
      const differentRefs = ['REF_123', 'WOMPI_456789', 'TXN_ABC123'];
      
      for (const ref of differentRefs) {
        const transactionWithRef = { ...mockPrismaTransaction, wompiReference: ref };
        prismaService.transaction.findFirst.mockResolvedValue(transactionWithRef);

        const result = await repository.findByWompiReference(ref);

        expect(result?.wompiReference).toBe(ref);
      }
    });
  });

  describe('save', () => {
    describe('creating new transaction', () => {
      it('should create new transaction when id is 0', async () => {
        // Arrange
        const newTransaction = Transaction.fromPersistence({
          id: 0,
          customerId: 102,
          productId: 202,
          productAmount: 30000,
          baseFee: 3000,
          deliveryFee: 6000,
          totalAmount: 39000,
          status: TransactionStatus.PENDING,
          wompiTransactionId: 'wompi_654321',
          wompiReference: 'REF_987654',
          paymentMethod: 'PSE',
          cardLastFour: undefined,
          cardBrand: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: undefined,
        });

        const createdTransaction = {
          id: 2,
          customerId: 102,
          productId: 202,
          productAmount: 30000,
          baseFee: 3000,
          deliveryFee: 6000,
          totalAmount: 39000,
          status: TransactionStatus.PENDING,
          wompiTransactionId: 'wompi_654321',
          wompiReference: 'REF_987654',
          paymentMethod: 'PSE',
          cardLastFour: null,
          cardBrand: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          customer: mockPrismaTransaction.customer,
          product: mockPrismaTransaction.product,
          delivery: mockPrismaTransaction.delivery,
        };

        prismaService.transaction.create.mockResolvedValue(createdTransaction);

        // Act
        const result = await repository.save(newTransaction);

        // Assert
        expect(prismaService.transaction.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            customerId: 102,
            productId: 202,
            productAmount: 30000,
            baseFee: 3000,
            deliveryFee: 6000,
            totalAmount: 39000,
            status: TransactionStatus.PENDING,
            wompiTransactionId: 'wompi_654321',
            wompiReference: 'REF_987654',
            paymentMethod: 'PSE',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          }),
          include: includeRelations,
        });
        expect(result).toBeInstanceOf(Transaction);
        expect(result.id).toBe(2);
      });
    });

    describe('updating existing transaction', () => {
      it('should update existing transaction when id > 0', async () => {
        // Arrange
        const existingTransaction = Transaction.fromPersistence({
          id: 1,
          customerId: 101,
          productId: 201,
          productAmount: 25000,
          baseFee: 2500,
          deliveryFee: 5000,
          totalAmount: 32500,
          status: TransactionStatus.COMPLETED,
          wompiTransactionId: 'wompi_123456',
          wompiReference: 'REF_789012',
          paymentMethod: 'CARD',
          cardLastFour: '1234',
          cardBrand: 'VISA',
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
        });

        const updatedTransaction = {
          ...mockPrismaTransaction,
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
        };

        prismaService.transaction.update.mockResolvedValue(updatedTransaction);

        // Act
        const result = await repository.save(existingTransaction);

        // Assert
        expect(prismaService.transaction.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            id: 1,
            customerId: 101,
            productId: 201,
            productAmount: 25000,
            baseFee: 2500,
            deliveryFee: 5000,
            totalAmount: 32500,
            status: TransactionStatus.COMPLETED,
            wompiTransactionId: 'wompi_123456',
            wompiReference: 'REF_789012',
            paymentMethod: 'CARD',
            cardLastFour: '1234',
            cardBrand: 'VISA',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            completedAt: expect.any(Date),
          },
          include: includeRelations,
        });
        expect(result).toBeInstanceOf(Transaction);
      });
    });
  });

  describe('update', () => {
    it('should update transaction with specific id', async () => {
      // Arrange
      const transactionToUpdate = Transaction.fromPersistence({
        id: 5, // Este id será ignorado porque se usa el parámetro
        customerId: 101,
        productId: 201,
        productAmount: 25000,
        baseFee: 2500,
        deliveryFee: 5000,
        totalAmount: 32500,
        status: TransactionStatus.FAILED,
        wompiTransactionId: 'wompi_123456',
        wompiReference: 'REF_789012',
        paymentMethod: 'CARD',
        cardLastFour: '1234',
        cardBrand: 'VISA',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: undefined,
      });

      const updatedTransaction = {
        ...mockPrismaTransaction,
        id: 3, // Se usa este id del parámetro
        status: TransactionStatus.FAILED,
      };

      prismaService.transaction.update.mockResolvedValue(updatedTransaction);

      // Act
      const result = await repository.update(3, transactionToUpdate);

      // Assert
      expect(prismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({
          id: 5,
          customerId: 101,
          productId: 201,
          productAmount: 25000,
          baseFee: 2500,
          deliveryFee: 5000,
          totalAmount: 32500,
          status: TransactionStatus.FAILED,
          wompiTransactionId: 'wompi_123456',
          wompiReference: 'REF_789012',
          paymentMethod: 'CARD',
          cardLastFour: '1234',
          cardBrand: 'VISA',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        include: includeRelations,
      });
      expect(result).toBeInstanceOf(Transaction);
      expect(result.id).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete transaction by id', async () => {
      // Arrange
      prismaService.transaction.delete.mockResolvedValue(mockPrismaTransaction);

      // Act
      await repository.delete(1);

      // Assert
      expect(prismaService.transaction.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('private methods coverage', () => {
    it('should test toDomain conversion with number parsing', async () => {
      // Arrange - Campos numéricos como strings para probar Number() conversion
      const prismaTransactionWithStringValues = {
        ...mockPrismaTransaction,
        productAmount: '25000',
        baseFee: '2500',
        deliveryFee: '5000',
        totalAmount: '32500',
      };
      prismaService.transaction.findUnique.mockResolvedValue(prismaTransactionWithStringValues);

      // Act
      const result = await repository.findById(1);

      // Assert - toDomain converts strings to numbers
      expect(result?.productAmount).toBe(25000);
      expect(result?.baseFee).toBe(2500);
      expect(result?.deliveryFee).toBe(5000);
      expect(result?.totalAmount).toBe(32500);
      expect(typeof result?.productAmount).toBe('number');
      expect(typeof result?.baseFee).toBe('number');
      expect(typeof result?.deliveryFee).toBe('number');
      expect(typeof result?.totalAmount).toBe('number');
    });

    it('should test toPersistence conversion through save method', async () => {
      // Arrange
      const transaction = Transaction.fromPersistence({
        id: 1,
        customerId: 101,
        productId: 201,
        productAmount: 25000,
        baseFee: 2500,
        deliveryFee: 5000,
        totalAmount: 32500,
        status: TransactionStatus.PENDING,
        wompiTransactionId: 'wompi_123456',
        wompiReference: 'REF_789012',
        paymentMethod: 'CARD',
        cardLastFour: '1234',
        cardBrand: 'VISA',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: undefined,
      });

      prismaService.transaction.update.mockResolvedValue(mockPrismaTransaction);

      // Act
      await repository.save(transaction);

      // Assert - Verifies toPersistence method is working
      expect(prismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          id: 1,
          customerId: 101,
          productId: 201,
          productAmount: 25000,
          baseFee: 2500,
          deliveryFee: 5000,
          totalAmount: 32500,
          status: TransactionStatus.PENDING,
          wompiTransactionId: 'wompi_123456',
          wompiReference: 'REF_789012',
          paymentMethod: 'CARD',
          cardLastFour: '1234',
          cardBrand: 'VISA',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        include: includeRelations,
      });
    });

    it('should handle null values for optional fields', async () => {
      // Arrange
      const transactionWithNulls = {
        ...mockPrismaTransaction,
        cardLastFour: null,
        cardBrand: null,
        completedAt: null,
      };
      prismaService.transaction.findUnique.mockResolvedValue(transactionWithNulls);

      // Act
      const result = await repository.findById(1);

      // Assert
      expect(result?.cardLastFour).toBeNull();
      expect(result?.cardBrand).toBeNull();
      expect(result?.completedAt).toBeNull();
    });

    it('should handle different payment methods', async () => {
      // Test para diferentes métodos de pago
      const paymentMethods = ['CARD', 'PSE', 'NEQUI', 'BANCOLOMBIA_TRANSFER'];

      for (const paymentMethod of paymentMethods) {
        const transactionWithPaymentMethod = {
          ...mockPrismaTransaction,
          paymentMethod,
        };
        prismaService.transaction.findUnique.mockResolvedValue(transactionWithPaymentMethod);

        const result = await repository.findById(1);

        expect(result?.paymentMethod).toBe(paymentMethod);
      }
    });
  });
});