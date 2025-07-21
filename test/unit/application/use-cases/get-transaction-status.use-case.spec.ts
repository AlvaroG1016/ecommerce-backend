// test/unit/application/use-cases/get-transaction-status/get-transaction-status.use-case.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GetTransactionStatusUseCase } from '../../../../src/application/use-cases/get-transaction-status/gettransactionstatus.use-case';
import { Transaction, TransactionStatus, PaymentMethod, CardBrand } from '../../../../src/domain/entities/transaction.entity';
import { Result } from '../../../../src/shared/utils/result.util';

// Imports de símbolos
import { PAYMENT_SERVICE } from '../../../../src/domain/services/payment.service.interface';
import { TRANSACTION_REPOSITORY } from '../../../../src/domain/repositories/transaction.repository';

// 🎭 MOCKS
const mockPaymentService = {
  getPaymentStatus: jest.fn(),
};

const mockTransactionRepository = {
  findById: jest.fn(),
  update: jest.fn(),
};

describe('GetTransactionStatusUseCase', () => {
  let useCase: GetTransactionStatusUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionStatusUseCase,
        { provide: PAYMENT_SERVICE, useValue: mockPaymentService },
        { provide: TRANSACTION_REPOSITORY, useValue: mockTransactionRepository },
      ],
    }).compile();

    useCase = module.get<GetTransactionStatusUseCase>(GetTransactionStatusUseCase);

    jest.clearAllMocks();
    
    // Mock console para evitar spam en tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful Status Retrieval', () => {
    it('should get transaction status when no provider transaction ID exists', async () => {
      // 🏗️ ARRANGE - transacción sin wompiTransactionId
      const transactionWithoutProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        undefined, // sin wompiTransactionId
        undefined  // sin wompiReference
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithoutProvider);

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.transaction).toEqual(transactionWithoutProvider);
      expect(result.value!.paymentStatus.providerStatus).toBeNull();
      expect(result.value!.paymentStatus.statusChanged).toBe(false);
      expect(result.value!.paymentStatus.currentStatus).toBe('PENDING');
      
      // No debe llamar al payment service
      expect(mockPaymentService.getPaymentStatus).not.toHaveBeenCalled();
    });

    it('should get status and update transaction when payment is approved', async () => {
      // 🏗️ ARRANGE - transacción CON wompiTransactionId
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_123', // ✅ CON wompiTransactionId
        undefined,
        PaymentMethod.CREDIT_CARD,
        '1234',
        CardBrand.VISA
      );

      const completedTransaction = transactionWithProvider.markAsCompleted('wompi_123', 'ref_123');

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      mockTransactionRepository.update.mockResolvedValue(completedTransaction);
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: true,
        status: 'APPROVED',
        message: 'Payment approved',
        providerTransactionId: 'wompi_123',
        reference: 'ref_123',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.statusChanged).toBe(true);
      expect(result.value!.paymentStatus.currentStatus).toBe('COMPLETED');
      expect(result.value!.paymentStatus.message).toContain('completed successfully');
      
      expect(mockPaymentService.getPaymentStatus).toHaveBeenCalledWith('wompi_123');
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(1, expect.any(Transaction));
    });

    it('should get status and update transaction when payment is declined', async () => {
      // 🏗️ ARRANGE
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_456', // ✅ CON wompiTransactionId
        undefined
      );

      const failedTransaction = transactionWithProvider.markAsFailed();

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      mockTransactionRepository.update.mockResolvedValue(failedTransaction);
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: false,
        status: 'DECLINED',
        message: 'Card declined',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.statusChanged).toBe(true);
      expect(result.value!.paymentStatus.currentStatus).toBe('FAILED');
      expect(result.value!.paymentStatus.message).toContain('has failed');
    });

    it('should handle pending status without updating transaction', async () => {
      // 🏗️ ARRANGE
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_789', // ✅ CON wompiTransactionId
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: false,
        status: 'PENDING',
        message: 'Still processing',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.statusChanged).toBe(false);
      expect(result.value!.paymentStatus.currentStatus).toBe('PENDING');
      expect(result.value!.paymentStatus.message).toContain('still being processed');
      
      // No debe actualizar la transacción
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    it('should handle different Wompi statuses correctly', async () => {
      // Test para ERROR status
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_error', // ✅ CON wompiTransactionId
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      mockTransactionRepository.update.mockResolvedValue(transactionWithProvider.markAsFailed());
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: false,
        status: 'ERROR',
        message: 'Payment error',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.currentStatus).toBe('FAILED');
    });

    it('should handle unknown Wompi status as FAILED', async () => {
      // 🏗️ ARRANGE
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_unknown', // ✅ CON wompiTransactionId
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      mockTransactionRepository.update.mockResolvedValue(transactionWithProvider.markAsFailed());
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: false,
        status: 'UNKNOWN_STATUS',
        message: 'Unknown status',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.currentStatus).toBe('FAILED');
    });
  });

  describe('Error Handling', () => {
    it('should fail with invalid transaction ID', async () => {
      // ⚡ ACT & ASSERT
      const result1 = await useCase.execute({ transactionId: 0 });
      expect(result1.isSuccess).toBe(false);
      expect(result1.error?.message).toContain('Valid transaction ID is required');

      const result2 = await useCase.execute({ transactionId: -1 });
      expect(result2.isSuccess).toBe(false);
      expect(result2.error?.message).toContain('Valid transaction ID is required');
    });

    it('should fail when transaction is not found', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockResolvedValue(null);

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 999 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Transaction 999 not found');
    });

    it('should fail when repository throws error', async () => {
      // 🏗️ ARRANGE
      mockTransactionRepository.findById.mockRejectedValue(new Error('Database error'));

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(false);
      expect(result.error?.message).toContain('Failed to get transaction');
    });

    it('should continue when payment service fails but transaction exists', async () => {
      // 🏗️ ARRANGE
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_fail', // ✅ CON wompiTransactionId
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      mockPaymentService.getPaymentStatus.mockRejectedValue(new Error('Provider timeout'));

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true); // Should succeed with original transaction
      expect(result.value!.transaction).toEqual(transactionWithProvider);
      expect(result.value!.paymentStatus.providerStatus).toBeNull();
      expect(result.value!.paymentStatus.statusChanged).toBe(false);
    });

    it('should continue when transaction update fails after status change', async () => {
      // 🏗️ ARRANGE
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_update_fail', // ✅ CON wompiTransactionId
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      mockTransactionRepository.update.mockRejectedValue(new Error('Update failed'));
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: true,
        status: 'APPROVED',
        message: 'Payment approved',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true); // Should succeed despite update failure
      expect(result.value!.paymentStatus.statusChanged).toBe(true);
    });
  });

  describe('Edge Cases and Status Messages', () => {
    it('should generate correct status messages for all transaction states', async () => {
      // Test COMPLETED status (no change)
      const completedTransaction = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.COMPLETED,
        'wompi_completed',
        'ref_completed'
      );

      mockTransactionRepository.findById.mockResolvedValue(completedTransaction);

      const result = await useCase.execute({ transactionId: 1 });
      expect(result.value!.paymentStatus.message).toBe('Payment completed successfully');
    });

    it('should handle VOIDED status from Wompi', async () => {
      // 🏗️ ARRANGE
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_voided', // ✅ CON wompiTransactionId
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      mockTransactionRepository.update.mockResolvedValue(transactionWithProvider.markAsFailed());
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: false,
        status: 'VOIDED',
        message: 'Payment voided',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.currentStatus).toBe('FAILED');
    });
  });

  describe('Provider Status Mapping', () => {
    it('should correctly map all Wompi statuses to domain statuses', async () => {
      const statusMappings = [
        { wompi: 'APPROVED', expected: 'COMPLETED', shouldUpdate: true },
        { wompi: 'DECLINED', expected: 'FAILED', shouldUpdate: true },
        { wompi: 'ERROR', expected: 'FAILED', shouldUpdate: true },
        { wompi: 'VOIDED', expected: 'FAILED', shouldUpdate: true },
        { wompi: 'PENDING', expected: 'PENDING', shouldUpdate: false },
        { wompi: 'RANDOM_STATUS', expected: 'FAILED', shouldUpdate: true }, // default case
      ];

      for (const mapping of statusMappings) {
        // 🏗️ ARRANGE
        const transaction = new Transaction(
          1, 1, 1, 100000, 5000, 3000, 108000, 
          TransactionStatus.PENDING,
          'wompi_test', // ✅ CON wompiTransactionId
          undefined
        );

        mockTransactionRepository.findById.mockResolvedValue(transaction);
        
        let updatedTransaction = transaction;
        if (mapping.shouldUpdate) {
          updatedTransaction = mapping.expected === 'COMPLETED' 
            ? transaction.markAsCompleted('wompi_test', 'ref_test')
            : transaction.markAsFailed();
        }

        mockTransactionRepository.update.mockResolvedValue(updatedTransaction);
        
        mockPaymentService.getPaymentStatus.mockResolvedValue({
          success: mapping.expected === 'COMPLETED',
          status: mapping.wompi,
          message: `Status: ${mapping.wompi}`,
          providerTransactionId: mapping.expected === 'COMPLETED' ? 'wompi_test' : undefined,
          reference: mapping.expected === 'COMPLETED' ? 'ref_test' : undefined,
        });

        // ⚡ ACT
        const result = await useCase.execute({ transactionId: 1 });

        // ✅ ASSERT
        expect(result.isSuccess).toBe(true);
        expect(result.value!.paymentStatus.currentStatus).toBe(mapping.expected);
        expect(result.value!.paymentStatus.statusChanged).toBe(mapping.shouldUpdate);

        // Reset mocks para la siguiente iteración
        jest.clearAllMocks();
      }
    });
  });

  describe('Response Building', () => {
    it('should build response with all required fields', async () => {
      // 🏗️ ARRANGE
      const mockTransaction = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        undefined,
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('transaction');
      expect(result.value).toHaveProperty('paymentStatus');
      expect(result.value!.paymentStatus).toHaveProperty('currentStatus');
      expect(result.value!.paymentStatus).toHaveProperty('providerStatus');
      expect(result.value!.paymentStatus).toHaveProperty('statusChanged');
      expect(result.value!.paymentStatus).toHaveProperty('message');
    });

    it('should include provider status when available', async () => {
      // 🏗️ ARRANGE
      const transactionWithProvider = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.PENDING,
        'wompi_with_status', // ✅ CON wompiTransactionId
        undefined
      );

      mockTransactionRepository.findById.mockResolvedValue(transactionWithProvider);
      
      mockPaymentService.getPaymentStatus.mockResolvedValue({
        success: false,
        status: 'PENDING',
        message: 'Still processing',
      });

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.providerStatus).toEqual({
        status: 'PENDING',
        success: false,
        message: 'Still processing',
        updatedAt: expect.any(String),
      });
    });

    it('should handle failed transaction state messages', async () => {
      // 🏗️ ARRANGE
      const failedTransaction = new Transaction(
        1, 1, 1, 100000, 5000, 3000, 108000, 
        TransactionStatus.FAILED,
        'wompi_failed',
        'ref_failed'
      );

      mockTransactionRepository.findById.mockResolvedValue(failedTransaction);

      // ⚡ ACT
      const result = await useCase.execute({ transactionId: 1 });

      // ✅ ASSERT
      expect(result.isSuccess).toBe(true);
      expect(result.value!.paymentStatus.message).toBe('Payment has failed. Please try again.');
    });
  });
});