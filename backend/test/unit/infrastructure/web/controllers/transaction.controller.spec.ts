import { Test, TestingModule } from '@nestjs/testing';
import { TransactionApplicationService } from 'src/application/services/transaction-application.service';
import { ResponseBuilderService } from 'src/application/services/response-builder.service';
import { Transaction, TransactionStatus, PaymentMethod, CardBrand } from 'src/domain/entities/transaction.entity';
import { Customer } from 'src/domain/entities/customer.entity';
import { Product } from 'src/domain/entities/product.entity';
import { Delivery } from 'src/domain/entities/delivery.entity';
import { HttpStatus } from '@nestjs/common';
import { TransactionController } from 'src/infrastructure/web/controllers/transaction.controller';
import { CreateTransactionWebDto } from 'src/infrastructure/web/dto/create-transaction-web.dto';
import { CreateTransactionResponse } from 'src/application/dto/response/create-transaction.response.dto';

describe('TransactionController', () => {
  let controller: TransactionController;
  let transactionService: jest.Mocked<TransactionApplicationService>;
  let responseBuilder: jest.Mocked<ResponseBuilderService>;

  // Mock entities using proper constructors
  const mockTransaction = new Transaction(
    1, // id
    1, // customerId
    1, // productId
    50.00, // productAmount
    5.00, // baseFee
    10.00, // deliveryFee
    65.00, // totalAmount
    TransactionStatus.PENDING,
    undefined, // wompiTransactionId
    undefined, // wompiReference
    PaymentMethod.CREDIT_CARD,
    '1234', // cardLastFour
    CardBrand.VISA,
    new Date(),
    new Date(),
    undefined // completedAt
  );

  const mockCustomer = new Customer(
    1,
    'John Doe',
    'john.doe@example.com',
    '+57 300 123 4567',
    new Date()
  );

  // Assuming Product has a similar constructor - adjust as needed
  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    price: 50.00,
    description: 'Test product description',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  // Assuming Delivery has a similar constructor - adjust as needed
  const mockDelivery: Delivery = {
    id: 1,
    address: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    phone: '+57 300 123 4567',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Delivery;

  const mockTransactionDto: CreateTransactionWebDto = {
    customer: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+57 300 123 4567',
    },
    productId: 1,
    quantity: 2,
    delivery: {
      address: '123 Main St',
      city: 'New York',
      postalCode: '10001',
      phone: '+57 300 123 4567',
    },
    payment: {
      method: PaymentMethod.CREDIT_CARD,
      cardLastFour: '1234',
      cardBrand: CardBrand.VISA,
    },
  };

  const mockSuccessResult: {
    success: boolean;
    data?: CreateTransactionResponse;
    error?: string;
  } = {
    success: true,
    data: {
      transaction: mockTransaction,
      customer: mockCustomer,
      product: mockProduct,
      delivery: mockDelivery,
    },
  };

  const mockErrorResult: {
    success: boolean;
    data?: CreateTransactionResponse;
    error?: string;
  } = {
    success: false,
    error: 'Invalid product ID - Product with ID 1 not found',
  };

  const mockSuccessResponse = {
    success: true,
    data: mockSuccessResult.data,
    message: 'Transaction created successfully',
    metadata: {
      timestamp: new Date().toISOString(), // El ResponseBuilderService agrega esto
      nextStep: 'PROCEED_TO_PAYMENT',
      recommendation: 'You can now proceed to pay for this transaction',
    },
  };

  const mockErrorResponse = {
    success: false,
    error: {
      message: 'Invalid product ID - Product with ID 1 not found',
      code: 'TRANSACTION_FAILED'
    },
    message: 'Transaction creation failed',
    metadata: {
      timestamp: new Date().toISOString(), // El ResponseBuilderService agrega esto
      nextStep: 'FIX_INPUT',
      recommendation: 'Please check your data and try again',
    },
  };

  const mockUnexpectedErrorResponse = {
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    },
    message: 'Internal server error',
    metadata: {
      timestamp: new Date().toISOString(), // El ResponseBuilderService agrega esto
      context: 'TransactionController.createTransaction',
    },
  };

  beforeEach(async () => {
    const mockTransactionService = {
      createTransaction: jest.fn(),
    };

    const mockResponseBuilder = {
      buildSuccessWithEntities: jest.fn(),
      buildError: jest.fn(),
      buildUnexpectedError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionApplicationService,
          useValue: mockTransactionService,
        },
        {
          provide: ResponseBuilderService,
          useValue: mockResponseBuilder,
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    transactionService = module.get(TransactionApplicationService);
    responseBuilder = module.get(ResponseBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      // Arrange
      transactionService.createTransaction.mockResolvedValue(mockSuccessResult);
      responseBuilder.buildSuccessWithEntities.mockReturnValue(mockSuccessResponse);

      // Act
      const result = await controller.createTransaction(mockTransactionDto);

      // Assert
      expect(transactionService.createTransaction).toHaveBeenCalledWith({
        customer: {
          name: mockTransactionDto.customer.name,
          email: mockTransactionDto.customer.email,
          phone: mockTransactionDto.customer.phone,
        },
        productId: mockTransactionDto.productId,
        quantity: mockTransactionDto.quantity,
        delivery: {
          address: mockTransactionDto.delivery.address,
          city: mockTransactionDto.delivery.city,
          postalCode: mockTransactionDto.delivery.postalCode,
          phone: mockTransactionDto.delivery.phone,
        },
        payment: {
          method: mockTransactionDto.payment.method,
          cardLastFour: mockTransactionDto.payment.cardLastFour,
          cardBrand: mockTransactionDto.payment.cardBrand,
        },
      });

      expect(responseBuilder.buildSuccessWithEntities).toHaveBeenCalledWith(
        mockSuccessResult.data,
        'Transaction created successfully',
        {
          nextStep: 'PROCEED_TO_PAYMENT',
          recommendation: 'You can now proceed to pay for this transaction',
        },
      );

      expect(result).toEqual(mockSuccessResponse);
      expect(responseBuilder.buildError).not.toHaveBeenCalled();
      expect(responseBuilder.buildUnexpectedError).not.toHaveBeenCalled();
    });

    it('should handle business logic error', async () => {
      // Arrange
      transactionService.createTransaction.mockResolvedValue(mockErrorResult);
      responseBuilder.buildError.mockReturnValue(mockErrorResponse);

      // Act
      const result = await controller.createTransaction(mockTransactionDto);

      // Assert
      expect(transactionService.createTransaction).toHaveBeenCalledWith({
        customer: {
          name: mockTransactionDto.customer.name,
          email: mockTransactionDto.customer.email,
          phone: mockTransactionDto.customer.phone,
        },
        productId: mockTransactionDto.productId,
        quantity: mockTransactionDto.quantity,
        delivery: {
          address: mockTransactionDto.delivery.address,
          city: mockTransactionDto.delivery.city,
          postalCode: mockTransactionDto.delivery.postalCode,
          phone: mockTransactionDto.delivery.phone,
        },
        payment: {
          method: mockTransactionDto.payment.method,
          cardLastFour: mockTransactionDto.payment.cardLastFour,
          cardBrand: mockTransactionDto.payment.cardBrand,
        },
      });

      expect(responseBuilder.buildError).toHaveBeenCalledWith(
        mockErrorResult.error,
        'Transaction creation failed',
        'TRANSACTION_FAILED',
        {
          nextStep: 'FIX_INPUT',
          recommendation: 'Please check your data and try again',
        },
      );

      expect(result).toEqual(mockErrorResponse);
      expect(responseBuilder.buildSuccessWithEntities).not.toHaveBeenCalled();
      expect(responseBuilder.buildUnexpectedError).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      transactionService.createTransaction.mockRejectedValue(unexpectedError);
      responseBuilder.buildUnexpectedError.mockReturnValue(mockUnexpectedErrorResponse);

      // Act
      const result = await controller.createTransaction(mockTransactionDto);

      // Assert
      expect(transactionService.createTransaction).toHaveBeenCalledWith({
        customer: {
          name: mockTransactionDto.customer.name,
          email: mockTransactionDto.customer.email,
          phone: mockTransactionDto.customer.phone,
        },
        productId: mockTransactionDto.productId,
        quantity: mockTransactionDto.quantity,
        delivery: {
          address: mockTransactionDto.delivery.address,
          city: mockTransactionDto.delivery.city,
          postalCode: mockTransactionDto.delivery.postalCode,
          phone: mockTransactionDto.delivery.phone,
        },
        payment: {
          method: mockTransactionDto.payment.method,
          cardLastFour: mockTransactionDto.payment.cardLastFour,
          cardBrand: mockTransactionDto.payment.cardBrand,
        },
      });

      expect(responseBuilder.buildUnexpectedError).toHaveBeenCalledWith(
        unexpectedError,
        'TransactionController.createTransaction',
      );

      expect(result).toEqual(mockUnexpectedErrorResponse);
      expect(responseBuilder.buildSuccessWithEntities).not.toHaveBeenCalled();
      expect(responseBuilder.buildError).not.toHaveBeenCalled();
    });

    it('should transform DTO correctly to request object', async () => {
      // Arrange
      transactionService.createTransaction.mockResolvedValue(mockSuccessResult);
      responseBuilder.buildSuccessWithEntities.mockReturnValue(mockSuccessResponse);

      // Act
      await controller.createTransaction(mockTransactionDto);

      // Assert - Verify the exact transformation
      const expectedRequest = {
        customer: {
          name: mockTransactionDto.customer.name,
          email: mockTransactionDto.customer.email,
          phone: mockTransactionDto.customer.phone,
        },
        productId: mockTransactionDto.productId,
        quantity: mockTransactionDto.quantity,
        delivery: {
          address: mockTransactionDto.delivery.address,
          city: mockTransactionDto.delivery.city,
          postalCode: mockTransactionDto.delivery.postalCode,
          phone: mockTransactionDto.delivery.phone,
        },
        payment: {
          method: mockTransactionDto.payment.method,
          cardLastFour: mockTransactionDto.payment.cardLastFour,
          cardBrand: mockTransactionDto.payment.cardBrand,
        },
      };

      expect(transactionService.createTransaction).toHaveBeenCalledWith(expectedRequest);
    });

    it('should handle null/undefined error in result', async () => {
      // Arrange
      const resultWithNullError: {
        success: boolean;
        data?: CreateTransactionResponse;
        error?: string;
      } = {
        success: false,
        error: undefined,
      };
      
      const mockErrorResponseWithUndefined = {
        success: false,
        error: {
          message: 'Transaction creation failed',
          code: 'TRANSACTION_FAILED'
        },
        message: 'Transaction creation failed',
        metadata: {
          timestamp: new Date().toISOString(), // El ResponseBuilderService agrega esto
          nextStep: 'FIX_INPUT',
          recommendation: 'Please check your data and try again',
        },
      };
      
      transactionService.createTransaction.mockResolvedValue(resultWithNullError);
      responseBuilder.buildError.mockReturnValue(mockErrorResponseWithUndefined);

      // Act
      const result = await controller.createTransaction(mockTransactionDto);

      // Assert
      expect(responseBuilder.buildError).toHaveBeenCalledWith(
        undefined,
        'Transaction creation failed',
        'TRANSACTION_FAILED',
        {
          nextStep: 'FIX_INPUT',
          recommendation: 'Please check your data and try again',
        },
      );

      expect(result).toEqual(mockErrorResponseWithUndefined);
    });
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have injected dependencies', () => {
      expect(transactionService).toBeDefined();
      expect(responseBuilder).toBeDefined();
    });
  });
});