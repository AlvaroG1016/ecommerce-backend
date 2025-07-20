// test/unit/application/services/response-builder.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ResponseBuilderService } from '../../../../src/application/services/response-builder.service';

describe('ResponseBuilderService', () => {
  let service: ResponseBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseBuilderService],
    }).compile();

    service = module.get<ResponseBuilderService>(ResponseBuilderService);
  });

  describe('buildSuccess', () => {
    it('should build success response with data and default metadata', () => {
      // 🏗️ ARRANGE
      const data = { id: 1, name: 'Test Product' };
      const message = 'Product retrieved successfully';

      // ⚡ ACT
      const result = service.buildSuccess(data, message);

      // ✅ ASSERT - SIN verificación de logs
      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'Test Product' },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'CONTINUE',
          recommendation: 'Operation completed successfully',
        },
      });
    });

    it('should build success response with custom metadata', () => {
      // 🏗️ ARRANGE
      const data = { transactionId: 123, status: 'COMPLETED' };
      const message = 'Payment processed successfully';
      const customMetadata = {
        nextStep: 'SHOW_SUCCESS',
        recommendation: 'Payment completed successfully',
        processedAt: new Date('2023-01-01'),
      };

      // ⚡ ACT
      const result = service.buildSuccess(data, message, customMetadata);

      // ✅ ASSERT
      expect(result).toEqual({
        success: true,
        data: { transactionId: 123, status: 'COMPLETED' },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'SHOW_SUCCESS',
          recommendation: 'Payment completed successfully',
          processedAt: new Date('2023-01-01'),
        },
      });
    });

    it('should override default metadata with custom metadata', () => {
      // 🏗️ ARRANGE
      const data = { message: 'test' };
      const customMetadata = {
        nextStep: 'CUSTOM_STEP',
        recommendation: 'Custom recommendation',
        extraField: 'extra value',
      };

      // ⚡ ACT
      const result = service.buildSuccess(data, 'Test message', customMetadata);

      // ✅ ASSERT
      expect(result.metadata).toEqual({
        timestamp: expect.any(String),
        nextStep: 'CUSTOM_STEP',
        recommendation: 'Custom recommendation',
        extraField: 'extra value',
      });
    });

    it('should handle null and undefined data', () => {
      // ⚡ ACT & ASSERT
      const nullResult = service.buildSuccess(null, 'Null data test');
      expect(nullResult.data).toBeNull();

      const undefinedResult = service.buildSuccess(undefined, 'Undefined data test');
      expect(undefinedResult.data).toBeUndefined();
    });
  });

  describe('buildError', () => {
    it('should build error response with string error and default metadata', () => {
      // 🏗️ ARRANGE
      const errorMessage = 'Transaction not found';
      const context = 'Payment processing';

      // ⚡ ACT
      const result = service.buildError(errorMessage, context);

      // ✅ ASSERT - SIN verificación de logs
      expect(result).toEqual({
        success: false,
        error: {
          message: 'Transaction not found',
          code: 'OPERATION_FAILED',
        },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'RETRY_OPERATION',
          recommendation: 'Please try again or contact support',
        },
      });
    });

    it('should build error response with Error object', () => {
      // 🏗️ ARRANGE
      const error = new Error('Database connection failed');
      const context = 'Data retrieval';
      const code = 'DATABASE_ERROR';

      // ⚡ ACT
      const result = service.buildError(error, context, code);

      // ✅ ASSERT - SIN verificación de logs
      expect(result).toEqual({
        success: false,
        error: {
          message: 'Database connection failed',
          code: 'DATABASE_ERROR',
        },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'RETRY_OPERATION',
          recommendation: 'Please try again or contact support',
        },
      });
    });

    it('should build error response with custom metadata', () => {
      // 🏗️ ARRANGE
      const errorMessage = 'Invalid card number';
      const context = 'Payment validation';
      const code = 'VALIDATION_ERROR';
      const customMetadata = {
        nextStep: 'CHECK_CARD_DETAILS',
        recommendation: 'Please verify your card number and try again',
        field: 'cardNumber',
      };

      // ⚡ ACT
      const result = service.buildError(errorMessage, context, code, customMetadata);

      // ✅ ASSERT
      expect(result).toEqual({
        success: false,
        error: {
          message: 'Invalid card number',
          code: 'VALIDATION_ERROR',
        },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'CHECK_CARD_DETAILS',
          recommendation: 'Please verify your card number and try again',
          field: 'cardNumber',
        },
      });
    });
  });

  describe('buildUnexpectedError', () => {
    it('should build unexpected error response', () => {
      // 🏗️ ARRANGE
      const error = new Error('Unexpected database error');
      const context = 'PaymentController.processPayment';
      const additionalInfo = { transactionId: 123, userId: 456 };

      // ⚡ ACT
      const result = service.buildUnexpectedError(error, context, additionalInfo);

      // ✅ ASSERT - SIN verificación de logs
      expect(result).toEqual({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'CONTACT_SUPPORT',
          recommendation: 'Please contact support if this problem persists',
        },
      });
    });

    it('should build unexpected error response without additional info', () => {
      // 🏗️ ARRANGE
      const error = new Error('System failure');
      const context = 'DataService.getData';

      // ⚡ ACT
      const result = service.buildUnexpectedError(error, context);

      // ✅ ASSERT
      expect(result).toEqual({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'CONTACT_SUPPORT',
          recommendation: 'Please contact support if this problem persists',
        },
      });
    });
  });

  describe('buildSuccessWithEntities', () => {
    it('should build success response and convert simple entities', () => {
      // 🏗️ ARRANGE
      const entities = {
        transaction: {
          id: 1,
          amount: 50000,
          status: 'COMPLETED',
        },
        product: {
          id: 2,
          name: 'iPhone',
          price: 1000000,
        },
      };
      const message = 'Entities retrieved successfully';
      const metadata = { nextStep: 'DISPLAY_DATA' };

      // ⚡ ACT
      const result = service.buildSuccessWithEntities(entities, message, metadata);

      // ✅ ASSERT
      expect(result).toEqual({
        success: true,
        data: {
          transaction: {
            id: 1,
            amount: 50000,
            status: 'COMPLETED',
          },
          product: {
            id: 2,
            name: 'iPhone',
            price: 1000000,
          },
        },
        metadata: {
          timestamp: expect.any(String),
          nextStep: 'DISPLAY_DATA',
          recommendation: 'Operation completed successfully',
        },
      });
    });

    it('should convert Decimal-like objects to numbers', () => {
      // 🏗️ ARRANGE - simular objetos Decimal
      const decimalLikeObject = {
        toString: () => '123.45',
      };

      const entities = {
        price: decimalLikeObject,
        amount: 50000,
        decimal_field: decimalLikeObject,
      };

      // ⚡ ACT
      const result = service.buildSuccessWithEntities(entities, 'Test message');

      // ✅ ASSERT
      expect(result.data).toEqual({
        price: 123.45,
        amount: 50000,
        decimal_field: 123.45,
      });
    });

    it('should handle arrays of entities', () => {
      // 🏗️ ARRANGE
      const entities = {
        products: [
          { id: 1, name: 'Product 1', price: 10000 },
          { id: 2, name: 'Product 2', price: 20000 },
        ],
        total: 2,
      };

      // ⚡ ACT
      const result = service.buildSuccessWithEntities(entities, 'Products retrieved');

      // ✅ ASSERT
      expect(result.data).toEqual({
        products: [
          { id: 1, name: 'Product 1', price: 10000 },
          { id: 2, name: 'Product 2', price: 20000 },
        ],
        total: 2,
      });
    });

    it('should handle nested objects', () => {
      // 🏗️ ARRANGE
      const entities = {
        transaction: {
          id: 1,
          customer: {
            id: 10,
            name: 'John Doe',
            address: {
              street: '123 Main St',
              city: 'Bogotá',
            },
          },
          amount: 75000,
        },
      };

      // ⚡ ACT
      const result = service.buildSuccessWithEntities(entities, 'Nested data test');

      // ✅ ASSERT
      expect(result.data).toEqual({
        transaction: {
          id: 1,
          customer: {
            id: 10,
            name: 'John Doe',
            address: {
              street: '123 Main St',
              city: 'Bogotá',
            },
          },
          amount: 75000,
        },
      });
    });

    it('should handle primitive values as entities', () => {
      // ⚡ ACT & ASSERT
      const stringResult = service.buildSuccessWithEntities('simple string', 'String test');
      expect(stringResult.data).toBe('simple string');

      const numberResult = service.buildSuccessWithEntities(42, 'Number test');
      expect(numberResult.data).toBe(42);

      const booleanResult = service.buildSuccessWithEntities(true, 'Boolean test');
      expect(booleanResult.data).toBe(true);
    });

    it('should handle null and undefined values', () => {
      // ⚡ ACT & ASSERT
      const nullResult = service.buildSuccessWithEntities(null, 'Null test');
      expect(nullResult.data).toBeNull();

      const undefinedResult = service.buildSuccessWithEntities(undefined, 'Undefined test');
      expect(undefinedResult.data).toBeUndefined();
    });

    it('should handle objects with special properties', () => {
      // 🏗️ ARRANGE
      const entities = {
        regularObject: {
          toString: () => 'not a number',
          someMethod: () => 'test',
        },
        stringValue: 'regular string',
      };

      // ⚡ ACT
      const result = service.buildSuccessWithEntities(entities, 'Special objects test');

      // ✅ ASSERT
      expect(result.data.regularObject).toEqual({
        toString: expect.any(Function),
        someMethod: expect.any(Function),
      });
      expect(result.data.stringValue).toBe('regular string');
    });
  });

  describe('response structure validation', () => {
    it('should always include timestamp in metadata', () => {
      const result = service.buildSuccess({ test: 'data' }, 'Test message');
      expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should maintain success true for success responses', () => {
      const result = service.buildSuccess('any data', 'Test');
      expect(result.success).toBe(true);
    });

    it('should maintain success false for error responses', () => {
      const result = service.buildError('error message', 'context');
      expect(result.success).toBe(false);
    });

    it('should include error structure in error responses', () => {
      const result = service.buildError('test error', 'test context', 'TEST_CODE');
      expect(result.error).toEqual({
        message: 'test error',
        code: 'TEST_CODE',
      });
    });
  });
});