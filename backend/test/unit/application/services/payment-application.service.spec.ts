// test/unit/application/services/payment-application.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentApplicationService } from '../../../../src/application/services/payment-application.service';
import { ProcessPaymentUseCase } from '../../../../src/application/use-cases/process-payment/process-payment.use-case';
import { GetTransactionStatusUseCase } from '../../../../src/application/use-cases/get-transaction-status/gettransactionstatus.use-case';
import { UpdateProductStockUseCase } from '../../../../src/application/use-cases/update-stock/update-product-stock.use-case';
import { Result } from '../../../../src/shared/utils/result.util';

// 🎭 MOCKS de las TRES dependencias
const mockProcessPaymentUseCase = {
  execute: jest.fn(),
};

const mockGetTransactionStatusUseCase = {
  execute: jest.fn(),
};

const mockUpdateProductStockUseCase = {
  execute: jest.fn(),
};

describe('PaymentApplicationService', () => {
  let service: PaymentApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentApplicationService,
        { provide: ProcessPaymentUseCase, useValue: mockProcessPaymentUseCase },
        { provide: GetTransactionStatusUseCase, useValue: mockGetTransactionStatusUseCase },
        { provide: UpdateProductStockUseCase, useValue: mockUpdateProductStockUseCase }, // ✅ AGREGADO
      ],
    }).compile();

    service = module.get<PaymentApplicationService>(PaymentApplicationService);
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      // 🏗️ ARRANGE
      const request = {
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      };

      const mockResponse = {
        transaction: { id: 1, status: 'COMPLETED' },
        product: { id: 1, name: 'iPhone' },
        paymentSuccess: true,
        message: 'Payment successful',
        requiresPolling: false,
      };

      mockProcessPaymentUseCase.execute.mockResolvedValue(Result.success(mockResponse));

      // ⚡ ACT
      const result = await service.processPayment(request);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockProcessPaymentUseCase.execute).toHaveBeenCalledWith(request);
    });

    it('should handle payment failure', async () => {
      // 🏗️ ARRANGE
      const request = {
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      };

      mockProcessPaymentUseCase.execute.mockResolvedValue(
        Result.failure(new Error('Payment failed'))
      );

      // ⚡ ACT
      const result = await service.processPayment(request);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed');
    });

    it('should handle unexpected errors during payment processing', async () => {
      // 🏗️ ARRANGE
      const request = {
        transactionId: 1,
        cardNumber: '4242424242424242',
        cardCvc: '123',
        cardExpMonth: '12',
        cardExpYear: '2025',
        cardHolder: 'John Doe',
      };

      mockProcessPaymentUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      // ⚡ ACT
      const result = await service.processPayment(request);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully without stock update', async () => {
      // 🏗️ ARRANGE
      const mockStatusResponse = {
        transaction: { id: 1, status: 'PENDING' },
        paymentStatus: {
          currentStatus: 'PENDING',
          statusChanged: false, // No cambió estado
        },
      };

      mockGetTransactionStatusUseCase.execute.mockResolvedValue(
        Result.success(mockStatusResponse)
      );

      // ⚡ ACT
      const result = await service.getTransactionStatus(1);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatusResponse);
      expect(mockGetTransactionStatusUseCase.execute).toHaveBeenCalledWith({ transactionId: 1 });
      
      // No debe llamar al update stock porque no cambió a COMPLETED
      expect(mockUpdateProductStockUseCase.execute).not.toHaveBeenCalled();
    });

    it('should get transaction status and update stock when status changes to COMPLETED', async () => {
      // 🏗️ ARRANGE
      const mockStatusResponse = {
        transaction: { id: 1, status: 'COMPLETED' },
        paymentStatus: {
          currentStatus: 'COMPLETED',
          statusChanged: true, // Cambió estado
        },
      };

      mockGetTransactionStatusUseCase.execute.mockResolvedValue(
        Result.success(mockStatusResponse)
      );
      
      // Mock de stock update exitoso
      mockUpdateProductStockUseCase.execute.mockResolvedValue(
        Result.success({ id: 1, stock: 9 })
      );

      // ⚡ ACT
      const result = await service.getTransactionStatus(1);

      // ✅ ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatusResponse);
      
      // Debe llamar al update stock porque cambió a COMPLETED
      expect(mockUpdateProductStockUseCase.execute).toHaveBeenCalledWith(1, 1);
    });

    it('should continue successfully even when stock update fails', async () => {
      // 🏗️ ARRANGE
      const mockStatusResponse = {
        transaction: { id: 1, status: 'COMPLETED' },
        paymentStatus: {
          currentStatus: 'COMPLETED',
          statusChanged: true,
        },
      };

      mockGetTransactionStatusUseCase.execute.mockResolvedValue(
        Result.success(mockStatusResponse)
      );
      
      // Mock de stock update fallido
      mockUpdateProductStockUseCase.execute.mockResolvedValue(
        Result.failure(new Error('Stock update failed'))
      );

      // ⚡ ACT
      const result = await service.getTransactionStatus(1);

      // ✅ ASSERT
      expect(result.success).toBe(true); // ✅ El proceso principal sigue siendo exitoso
      expect(result.data).toEqual(mockStatusResponse);
      expect(mockUpdateProductStockUseCase.execute).toHaveBeenCalledWith(1, 1);
    });

    it('should handle status check failure', async () => {
      // 🏗️ ARRANGE
      mockGetTransactionStatusUseCase.execute.mockResolvedValue(
        Result.failure(new Error('Transaction not found'))
      );

      // ⚡ ACT
      const result = await service.getTransactionStatus(999);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction not found');
    });

    it('should handle unexpected errors during status check', async () => {
      // 🏗️ ARRANGE
      mockGetTransactionStatusUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      // ⚡ ACT
      const result = await service.getTransactionStatus(1);

      // ✅ ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while getting transaction status');
    });
  });

  describe('shouldUpdateStock logic', () => {
    it('should update stock when status changed to COMPLETED', async () => {
      // 🏗️ ARRANGE - simular escenario donde debe actualizar stock
      const mockStatusResponse = {
        transaction: { id: 1, status: 'COMPLETED' },
        paymentStatus: {
          currentStatus: 'COMPLETED',
          statusChanged: true,
        },
      };

      mockGetTransactionStatusUseCase.execute.mockResolvedValue(
        Result.success(mockStatusResponse)
      );
      mockUpdateProductStockUseCase.execute.mockResolvedValue(
        Result.success({ id: 1, stock: 9 })
      );

      // ⚡ ACT
      await service.getTransactionStatus(1);

      // ✅ ASSERT
      expect(mockUpdateProductStockUseCase.execute).toHaveBeenCalledWith(1, 1);
    });

    it('should NOT update stock when status changed but not to COMPLETED', async () => {
      // 🏗️ ARRANGE
      const mockStatusResponse = {
        transaction: { id: 1, status: 'FAILED' },
        paymentStatus: {
          currentStatus: 'FAILED',
          statusChanged: true, // Cambió pero a FAILED
        },
      };

      mockGetTransactionStatusUseCase.execute.mockResolvedValue(
        Result.success(mockStatusResponse)
      );

      // ⚡ ACT
      await service.getTransactionStatus(1);

      // ✅ ASSERT
      expect(mockUpdateProductStockUseCase.execute).not.toHaveBeenCalled();
    });

    it('should NOT update stock when status is COMPLETED but did not change', async () => {
      // 🏗️ ARRANGE
      const mockStatusResponse = {
        transaction: { id: 1, status: 'COMPLETED' },
        paymentStatus: {
          currentStatus: 'COMPLETED',
          statusChanged: false, // No cambió (ya era COMPLETED)
        },
      };

      mockGetTransactionStatusUseCase.execute.mockResolvedValue(
        Result.success(mockStatusResponse)
      );

      // ⚡ ACT
      await service.getTransactionStatus(1);

      // ✅ ASSERT
      expect(mockUpdateProductStockUseCase.execute).not.toHaveBeenCalled();
    });
  });
});