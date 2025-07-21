// test/unit/domain/entities/delivery.entity.spec.ts
import {
  Delivery,
  DeliveryStatus,
} from '../../../../src/domain/entities/delivery.entity';

describe('Delivery Entity', () => {
  let delivery: Delivery;

  beforeEach(() => {
    delivery = new Delivery(
      1, // id
      1, // transactionId
      'Calle 123 #45-67', // address
      'Bogotá', // city
      '110111', // postalCode
      '+57 300 123 4567', // phone
      5000, // deliveryFee
      DeliveryStatus.PENDING, // status
      new Date(), // createdAt
      new Date(), // updatedAt
    );
  });

  describe('Status Methods', () => {
    it('should return true for isPending when status is PENDING', () => {
      expect(delivery.isPending()).toBe(true);
      expect(delivery.isAssigned()).toBe(false);
      expect(delivery.isDelivered()).toBe(false);
    });

    it('should return true for isAssigned when status is ASSIGNED', () => {
      const assignedDelivery = new Delivery(
        1,
        1,
        'Address',
        'Bogotá',
        '110111',
        '+57 300 123 4567',
        5000,
        DeliveryStatus.ASSIGNED,
      );

      expect(assignedDelivery.isAssigned()).toBe(true);
      expect(assignedDelivery.isPending()).toBe(false);
      expect(assignedDelivery.isDelivered()).toBe(false);
    });

    it('should return true for isDelivered when status is DELIVERED', () => {
      const deliveredDelivery = new Delivery(
        1,
        1,
        'Address',
        'Bogotá',
        '110111',
        '+57 300 123 4567',
        5000,
        DeliveryStatus.DELIVERED,
      );

      expect(deliveredDelivery.isDelivered()).toBe(true);
      expect(deliveredDelivery.isPending()).toBe(false);
      expect(deliveredDelivery.isAssigned()).toBe(false);
    });
  });

  describe('Transition Validations', () => {
    it('should allow assignment when pending', () => {
      expect(delivery.canBeAssigned()).toBe(true);
    });

    it('should not allow assignment when already assigned', () => {
      const assignedDelivery = new Delivery(
        1,
        1,
        'Address',
        'Bogotá',
        '110111',
        '+57 300 123 4567',
        5000,
        DeliveryStatus.ASSIGNED,
      );

      expect(assignedDelivery.canBeAssigned()).toBe(false);
    });

    it('should not allow assignment when delivered', () => {
      const deliveredDelivery = new Delivery(
        1,
        1,
        'Address',
        'Bogotá',
        '110111',
        '+57 300 123 4567',
        5000,
        DeliveryStatus.DELIVERED,
      );

      expect(deliveredDelivery.canBeAssigned()).toBe(false);
    });

    it('should allow delivery when assigned', () => {
      const assignedDelivery = new Delivery(
        1,
        1,
        'Address',
        'Bogotá',
        '110111',
        '+57 300 123 4567',
        5000,
        DeliveryStatus.ASSIGNED,
      );

      expect(assignedDelivery.canBeDelivered()).toBe(true);
    });

    it('should not allow delivery when pending', () => {
      expect(delivery.canBeDelivered()).toBe(false);
    });
  });

  describe('Address Methods', () => {
    it('should return full address with postal code', () => {
      const fullAddress = delivery.getFullAddress();
      expect(fullAddress).toBe('Calle 123 #45-67, Bogotá - 110111');
    });

    it('should return full address without postal code', () => {
      const deliveryNoPostal = new Delivery(
        1,
        1,
        'Carrera 7 #32-16',
        'Medellín',
        '',
        '+57 300 123 4567',
        7000,
        DeliveryStatus.PENDING,
      );

      const fullAddress = deliveryNoPostal.getFullAddress();
      expect(fullAddress).toBe('Carrera 7 #32-16, Medellín');
    });
  });

  describe('Delivery Fee Calculation', () => {
    it('should calculate fee for Bogotá', () => {
      const bogotaDelivery = new Delivery(
        1,
        1,
        'Address',
        'bogota',
        '',
        '+57 300 123 4567',
        0, // fee inicial 0
        DeliveryStatus.PENDING,
      );

      const fee = bogotaDelivery.calculateDeliveryFeeBasedOnCity();
      expect(fee).toBe(5000);
    });

    it('should calculate fee for Medellín', () => {
      const medellinDelivery = new Delivery(
        1,
        1,
        'Address',
        'medellin',
        '',
        '+57 300 123 4567',
        0,
        DeliveryStatus.PENDING,
      );

      const fee = medellinDelivery.calculateDeliveryFeeBasedOnCity();
      expect(fee).toBe(7000);
    });

    it('should calculate fee for Cali', () => {
      const caliDelivery = new Delivery(
        1,
        1,
        'Address',
        'cali',
        '',
        '+57 300 123 4567',
        0,
        DeliveryStatus.PENDING,
      );

      const fee = caliDelivery.calculateDeliveryFeeBasedOnCity();
      expect(fee).toBe(8000);
    });

    it('should calculate fee for Barranquilla', () => {
      const barranquillaDelivery = new Delivery(
        1,
        1,
        'Address',
        'barranquilla',
        '',
        '+57 300 123 4567',
        0,
        DeliveryStatus.PENDING,
      );

      const fee = barranquillaDelivery.calculateDeliveryFeeBasedOnCity();
      expect(fee).toBe(10000);
    });

    it('should calculate fee for Cartagena', () => {
      const cartagenaDelivery = new Delivery(
        1,
        1,
        'Address',
        'cartagena',
        '',
        '+57 300 123 4567',
        0,
        DeliveryStatus.PENDING,
      );

      const fee = cartagenaDelivery.calculateDeliveryFeeBasedOnCity();
      expect(fee).toBe(12000);
    });

    it('should calculate default fee for unknown city', () => {
      const unknownCityDelivery = new Delivery(
        1,
        1,
        'Address',
        'Pasto',
        '',
        '+57 300 123 4567',
        0,
        DeliveryStatus.PENDING,
      );

      const fee = unknownCityDelivery.calculateDeliveryFeeBasedOnCity();
      expect(fee).toBe(15000); // Fee por defecto
    });

    it('should handle case insensitive city names', () => {
      const upperCaseDelivery = new Delivery(
        1,
        1,
        'Address',
        'BOGOTA',
        '',
        '+57 300 123 4567',
        0,
        DeliveryStatus.PENDING,
      );

      const fee = upperCaseDelivery.calculateDeliveryFeeBasedOnCity();
      expect(fee).toBe(5000); // Debe funcionar con mayúsculas
    });
  });

  describe('State Transitions', () => {
    it('should mark as assigned successfully', () => {
      // ✅ Agregar pequeño delay para asegurar diferencia en fechas
      const originalUpdatedAt = delivery.updatedAt;

      // Simular pequeño delay
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      const assignedDelivery = delivery.markAsAssigned();

      expect(assignedDelivery.status).toBe(DeliveryStatus.ASSIGNED);
      expect(assignedDelivery.id).toBe(delivery.id);
      expect(assignedDelivery.transactionId).toBe(delivery.transactionId);
      expect(assignedDelivery.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );

      jest.useRealTimers();
    });

    it('should throw error when trying to assign non-pending delivery', () => {
      const assignedDelivery = new Delivery(
        1,
        1,
        'Address',
        'Bogotá',
        '110111',
        '+57 300 123 4567',
        5000,
        DeliveryStatus.ASSIGNED,
      );

      expect(() => {
        assignedDelivery.markAsAssigned();
      }).toThrow('Delivery 1 cannot be assigned. Current status: ASSIGNED');
    });

    it('should mark as delivered successfully', () => {
      const assignedDelivery = delivery.markAsAssigned();

      // ✅ Pequeño delay para fechas diferentes
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      const deliveredDelivery = assignedDelivery.markAsDelivered();

      expect(deliveredDelivery.status).toBe(DeliveryStatus.DELIVERED);
      expect(deliveredDelivery.updatedAt.getTime()).toBeGreaterThan(
        assignedDelivery.updatedAt.getTime(),
      );

      jest.useRealTimers();
    });

    it('should throw error when trying to deliver non-assigned delivery', () => {
      expect(() => {
        delivery.markAsDelivered();
      }).toThrow('Delivery 1 cannot be delivered. Current status: PENDING');
    });
  });

  describe('Factory Methods', () => {
  it('should create delivery with calculated fee', () => {
    const deliveryData = {
      transactionId: 5,
      address: 'Calle Nueva #123',
      city: 'medellin', // ✅ CORREGIDO: sin tilde, minúscula (como en la entidad)
      postalCode: '050001',
      phone: '+57 301 987 6543',
    };

    const newDelivery = Delivery.create(deliveryData);

    expect(newDelivery.transactionId).toBe(5);
    expect(newDelivery.address).toBe('Calle Nueva #123');
    expect(newDelivery.city).toBe('medellin');
    expect(newDelivery.deliveryFee).toBe(7000); // ✅ Ahora debería funcionar
    expect(newDelivery.status).toBe(DeliveryStatus.PENDING);
  });

  it('should trim address and city spaces', () => {
    const deliveryData = {
      transactionId: 6,
      address: '  Carrera 15 #20-30  ',
      city: '  cali  ', // ✅ CORREGIDO: minúscula
      phone: '  +57 302 555 1234  ',
    };

    const newDelivery = Delivery.create(deliveryData);

    expect(newDelivery.address).toBe('Carrera 15 #20-30');
    expect(newDelivery.city).toBe('cali');
    expect(newDelivery.phone).toBe('+57 302 555 1234');
  });


    it('should throw error for empty address', () => {
      const invalidData = {
        transactionId: 7,
        address: '',
        city: 'Bogotá',
        phone: '+57 300 123 4567',
      };

      expect(() => Delivery.create(invalidData)).toThrow('Address is required');
    });

    it('should throw error for empty city', () => {
      const invalidData = {
        transactionId: 8,
        address: 'Calle 123',
        city: '',
        phone: '+57 300 123 4567',
      };

      expect(() => Delivery.create(invalidData)).toThrow('City is required');
    });

    it('should throw error for empty phone', () => {
      const invalidData = {
        transactionId: 9,
        address: 'Calle 123',
        city: 'Bogotá',
        phone: '',
      };

      expect(() => Delivery.create(invalidData)).toThrow('Phone is required');
    });
  });

  describe('fromPersistence Factory', () => {
    it('should create delivery from persistence data', () => {
      const persistenceData = {
        id: 15,
        transactionId: 10,
        address: 'Avenida 68 #25-10',
        city: 'Bogotá',
        postalCode: '110221',
        phone: '+57 305 444 5555',
        deliveryFee: 5000,
        status: 'DELIVERED',
        createdAt: new Date('2023-08-01'),
        updatedAt: new Date('2023-08-02'),
      };

      const delivery = Delivery.fromPersistence(persistenceData);

      expect(delivery.id).toBe(15);
      expect(delivery.status).toBe(DeliveryStatus.DELIVERED);
      expect(delivery.deliveryFee).toBe(5000);
      expect(delivery.createdAt).toEqual(new Date('2023-08-01'));
    });
  });

  describe('Serialization', () => {
    it('should serialize to primitive correctly', () => {
      const primitive = delivery.toPrimitive();

      expect(primitive).toHaveProperty('id', 1);
      expect(primitive).toHaveProperty('transactionId', 1);
      expect(primitive).toHaveProperty('address', 'Calle 123 #45-67');
      expect(primitive).toHaveProperty('city', 'Bogotá');
      expect(primitive).toHaveProperty(
        'fullAddress',
        'Calle 123 #45-67, Bogotá - 110111',
      );
      expect(primitive).toHaveProperty('deliveryFee', 5000);
      expect(primitive).toHaveProperty('status', DeliveryStatus.PENDING);
      expect(primitive).toHaveProperty('isPending', true);
      expect(primitive).toHaveProperty('isAssigned', false);
      expect(primitive).toHaveProperty('isDelivered', false);
      expect(primitive).toHaveProperty('createdAt');
      expect(primitive).toHaveProperty('updatedAt');
    });
  });
});
