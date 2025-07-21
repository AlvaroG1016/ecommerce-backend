import {
  CardBrand,
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from '../../../../src/domain/entities/transaction.entity';

describe('Transaction Entity', () => {
  // ✅ describe = grupo de tests relacionados
  // ✅ Cada función 'it' o 'test' es un test individual

  let transaction: Transaction;

  beforeEach(() => {
    // ✅ beforeEach se ejecuta ANTES de cada test
    // ✅ Aquí preparamos datos que necesitan todos los tests
    transaction = new Transaction(
      1, // id
      1, // customerId
      1, // productId
      100000, // productAmount
      5000, // baseFee
      3000, // deliveryFee
      108000, // totalAmount
      TransactionStatus.PENDING,
      undefined, // wompiTransactionId
      undefined, // wompiReference
      PaymentMethod.CREDIT_CARD,
      '1234', // cardLastFour
      CardBrand.VISA,
      new Date(), // createdAt
      new Date(), // updatedAt
    );
  });

  // ✅ TEST 1: Verificar que isPending funciona
  it('should return true for isPending when status is PENDING', () => {
    // Arrange (preparar) - ya está en beforeEach

    // Act (actuar) - llamar al método que queremos testear
    const result = transaction.isPending();

    // Assert (verificar) - comprobar que el resultado es correcto
    expect(result).toBe(true);
    expect(transaction.isCompleted()).toBe(false);
    expect(transaction.isFailed()).toBe(false);
  });

  // ✅ TEST 2: Verificar cálculo de total
  it('should calculate total correctly', () => {
    // Act
    const total = transaction.calculateTotal();

    // Assert
    const expectedTotal = 100000 + 5000 + 3000; // 108000
    expect(total).toBe(expectedTotal);
  });

  // ✅ TEST 3: Verificar validación de monto
  it('should validate amount correctly', () => {
    // Act
    const isValid = transaction.isAmountValid();

    // Assert
    expect(isValid).toBe(true);
  });

  // ✅ TEST 4: Verificar transición de estado
  it('should mark as completed successfully', () => {
    // Act
    const completedTransaction = transaction.markAsCompleted(
      'wompi_123',
      'ref_123',
    );

    // Assert
    expect(completedTransaction.status).toBe(TransactionStatus.COMPLETED);
    expect(completedTransaction.wompiTransactionId).toBe('wompi_123');
    expect(completedTransaction.wompiReference).toBe('ref_123');
    expect(completedTransaction.completedAt).toBeDefined();
  });

  // ✅ TEST 5: Verificar manejo de errores
  it('should throw error when trying to complete non-pending transaction', () => {
    // Arrange - crear transacción ya completada
    const completedTransaction = new Transaction(
      1,
      1,
      1,
      100000,
      5000,
      3000,
      108000,
      TransactionStatus.COMPLETED, // Ya está completada
    );

    // Act & Assert - verificar que lance error
    expect(() => {
      completedTransaction.markAsCompleted('wompi_123', 'ref_123');
    }).toThrow('Transaction 1 cannot be completed');
  });

  describe('Transaction Entity - Additional Tests', () => {
    // ... tu código existente ...

    describe('markAsPending Method', () => {
      it('should mark transaction as pending with provider info', () => {
        const pendingTransaction = transaction.markAsPending(
          'wompi_456',
          'ref_456',
        );

        expect(pendingTransaction.status).toBe(TransactionStatus.PENDING);
        expect(pendingTransaction.wompiTransactionId).toBe('wompi_456');
        expect(pendingTransaction.wompiReference).toBe('ref_456');
        expect(pendingTransaction.completedAt).toBeUndefined();
      });

      it('should mark transaction as pending without provider info', () => {
        const pendingTransaction = transaction.markAsPending();

        expect(pendingTransaction.status).toBe(TransactionStatus.PENDING);
        expect(pendingTransaction.wompiTransactionId).toBeUndefined();
        expect(pendingTransaction.wompiReference).toBeUndefined();
      });

      it('should preserve existing provider info when not provided', () => {
        // Crear transacción con info previa
        const transactionWithInfo = new Transaction(
          1,
          1,
          1,
          100000,
          5000,
          3000,
          108000,
          TransactionStatus.PENDING,
          'existing_wompi',
          'existing_ref',
        );

        const updatedTransaction = transactionWithInfo.markAsPending();

        expect(updatedTransaction.wompiTransactionId).toBe('existing_wompi');
        expect(updatedTransaction.wompiReference).toBe('existing_ref');
      });
    });

    describe('updateProviderInfo Method', () => {
      it('should update provider info maintaining current status', () => {
        const updatedTransaction = transaction.updateProviderInfo(
          'new_wompi',
          'new_ref',
        );

        expect(updatedTransaction.status).toBe(TransactionStatus.PENDING); // Mantiene status
        expect(updatedTransaction.wompiTransactionId).toBe('new_wompi');
        expect(updatedTransaction.wompiReference).toBe('new_ref');
        expect(updatedTransaction.updatedAt).toBeDefined();
      });

      it('should preserve completedAt when updating provider info', () => {
        const completedTransaction = transaction.markAsCompleted(
          'wompi_123',
          'ref_123',
        );
        const updatedTransaction = completedTransaction.updateProviderInfo(
          'new_wompi',
          'new_ref',
        );

        expect(updatedTransaction.completedAt).toBeDefined();
        expect(updatedTransaction.status).toBe(TransactionStatus.COMPLETED);
      });
    });

    describe('Factory Method - fromPersistence', () => {
      it('should create transaction from persistence data', () => {
        const persistenceData = {
          id: 10,
          customerId: 5,
          productId: 3,
          productAmount: 200000,
          baseFee: 10000,
          deliveryFee: 5000,
          totalAmount: 215000,
          status: 'COMPLETED',
          wompiTransactionId: 'wompi_persistence',
          wompiReference: 'ref_persistence',
          paymentMethod: 'CREDIT_CARD',
          cardLastFour: '9876',
          cardBrand: 'MASTERCARD',
          createdAt: new Date('2023-06-15'),
          updatedAt: new Date('2023-06-16'),
          completedAt: new Date('2023-06-16'),
        };

        const transaction = Transaction.fromPersistence(persistenceData);

        expect(transaction.id).toBe(10);
        expect(transaction.status).toBe(TransactionStatus.COMPLETED);
        expect(transaction.wompiTransactionId).toBe('wompi_persistence');
        expect(transaction.paymentMethod).toBe(PaymentMethod.CREDIT_CARD);
        expect(transaction.cardBrand).toBe(CardBrand.MASTERCARD);
        expect(transaction.completedAt).toEqual(new Date('2023-06-16'));
      });

      it('should handle optional fields in persistence data', () => {
        const minimalData = {
          id: 11,
          customerId: 6,
          productId: 4,
          productAmount: 150000,
          baseFee: 7500,
          deliveryFee: 2500,
          totalAmount: 160000,
          status: 'PENDING',
          createdAt: new Date('2023-07-01'),
          updatedAt: new Date('2023-07-01'),
        };

        const transaction = Transaction.fromPersistence(minimalData);

        expect(transaction.id).toBe(11);
        expect(transaction.wompiTransactionId).toBeUndefined();
        expect(transaction.wompiReference).toBeUndefined();
        expect(transaction.completedAt).toBeUndefined();
        expect(transaction.status).toBe(TransactionStatus.PENDING);
      });
    });

    describe('toPrimitive Serialization', () => {
      it('should serialize all properties correctly', () => {
        const completedTransaction = transaction.markAsCompleted(
          'wompi_serialize',
          'ref_serialize',
        );
        const primitive = completedTransaction.toPrimitive();

        expect(primitive).toHaveProperty('id', 1);
        expect(primitive).toHaveProperty('customerId', 1);
        expect(primitive).toHaveProperty('productId', 1);
        expect(primitive).toHaveProperty('productAmount', 100000);
        expect(primitive).toHaveProperty('baseFee', 5000);
        expect(primitive).toHaveProperty('deliveryFee', 3000);
        expect(primitive).toHaveProperty('totalAmount', 108000);
        expect(primitive).toHaveProperty('formattedAmount');
        expect(primitive).toHaveProperty('status', TransactionStatus.COMPLETED);
        expect(primitive).toHaveProperty(
          'wompiTransactionId',
          'wompi_serialize',
        );
        expect(primitive).toHaveProperty('wompiReference', 'ref_serialize');
        expect(primitive).toHaveProperty('isPending', false);
        expect(primitive).toHaveProperty('isCompleted', true);
        expect(primitive).toHaveProperty('isFailed', false);
        expect(primitive).toHaveProperty('createdAt');
        expect(primitive).toHaveProperty('updatedAt');
        expect(primitive).toHaveProperty('completedAt');
      });

      it('should format amount correctly in Colombian pesos', () => {
        const primitive = transaction.toPrimitive();
        expect(primitive.formattedAmount).toContain('$');
        expect(primitive.formattedAmount).toContain('108.000'); // Formato colombiano
      });
    });

    describe('Edge Cases and Additional Validations', () => {
      it('should detect invalid amount with significant difference', () => {
        const invalidTransaction = new Transaction(
          1,
          1,
          1,
          100000,
          5000,
          3000,
          109000, // ✅ Diferencia de 1000 (> 0.01)
          TransactionStatus.PENDING,
        );

        expect(invalidTransaction.isAmountValid()).toBe(false);
      });

      it('should handle exact amount validation within tolerance', () => {
        const validTransaction = new Transaction(
          1,
          1,
          1,
          100000,
          5000,
          3000,
          108000.005, // ✅ Diferencia de 0.005 (< 0.01)
          TransactionStatus.PENDING,
        );

        expect(validTransaction.isAmountValid()).toBe(true);
      });

      it('should detect amount just outside tolerance', () => {
        const invalidTransaction = new Transaction(
          1,
          1,
          1,
          100000,
          5000,
          3000,
          108000.02, // ✅ Diferencia de 0.02 (> 0.01)
          TransactionStatus.PENDING,
        );

        expect(invalidTransaction.isAmountValid()).toBe(false);
      });

      it('should throw error when trying to fail non-pending transaction', () => {
        const completedTransaction = new Transaction(
          1,
          1,
          1,
          100000,
          5000,
          3000,
          108000,
          TransactionStatus.COMPLETED,
        );

        expect(() => {
          completedTransaction.markAsFailed();
        }).toThrow('Transaction 1 cannot be failed. Current status: COMPLETED');
      });
    });
  });
});
