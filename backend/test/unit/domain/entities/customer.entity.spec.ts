// test/unit/domain/entities/customer.entity.spec.ts
import { Customer } from "../../../../src/domain/entities/customer.entity";

describe('Customer Entity', () => {
  let customer: Customer;

  beforeEach(() => {
    customer = new Customer(
      1,                           // id
      'Juan Pérez',               // name
      'juan@example.com',         // email
      '+57 300 123 4567',         // phone
      new Date(),                 // createdAt
    );
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      expect(customer.isValidEmail()).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidCustomer = new Customer(
        1, 'Juan', 'invalid-email', '+57 300 123 4567'
      );
      expect(invalidCustomer.isValidEmail()).toBe(false);
    });

    it('should reject email without @', () => {
      const invalidCustomer = new Customer(
        1, 'Juan', 'emailwithoutatsign.com', '+57 300 123 4567'
      );
      expect(invalidCustomer.isValidEmail()).toBe(false);
    });

    it('should reject email without domain', () => {
      const invalidCustomer = new Customer(
        1, 'Juan', 'email@', '+57 300 123 4567'
      );
      expect(invalidCustomer.isValidEmail()).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('should validate correct Colombian phone format', () => {
      expect(customer.isValidPhone()).toBe(true);
    });

    it('should reject phone without +57', () => {
      const invalidCustomer = new Customer(
        1, 'Juan', 'juan@test.com', '300 123 4567'
      );
      expect(invalidCustomer.isValidPhone()).toBe(false);
    });

    it('should reject phone with wrong format', () => {
      const invalidCustomer = new Customer(
        1, 'Juan', 'juan@test.com', '+57 3001234567'
      );
      expect(invalidCustomer.isValidPhone()).toBe(false);
    });

    it('should reject phone with letters', () => {
      const invalidCustomer = new Customer(
        1, 'Juan', 'juan@test.com', '+57 300 ABC 4567'
      );
      expect(invalidCustomer.isValidPhone()).toBe(false);
    });
  });

  describe('Display Methods', () => {
    it('should return trimmed display name', () => {
      const customerWithSpaces = new Customer(
        1, '  Juan Pérez  ', 'juan@test.com', '+57 300 123 4567'
      );
      expect(customerWithSpaces.getDisplayName()).toBe('Juan Pérez');
    });

    it('should return masked email', () => {
      const maskedEmail = customer.getMaskedEmail();
      expect(maskedEmail).toBe('j**n@example.com');
    });

    it('should mask single character username', () => {
      const shortCustomer = new Customer(
        1, 'Ana', 'a@test.com', '+57 300 123 4567'
      );
      const maskedEmail = shortCustomer.getMaskedEmail();
      expect(maskedEmail).toBe('a@test.com'); // Username muy corto no se enmascara
    });
  });

  describe('Factory Methods', () => {
    it('should create customer with valid data', () => {
      const customerData = {
        name: 'María García',
        email: 'maria@example.com',
        phone: '+57 301 987 6543',
      };

      const newCustomer = Customer.create(customerData);
      expect(newCustomer.name).toBe('María García');
      expect(newCustomer.email).toBe('maria@example.com');
      expect(newCustomer.phone).toBe('+57 301 987 6543');
      expect(newCustomer.id).toBe(0); // ID asignado por DB
    });

    it('should normalize email to lowercase', () => {
      const customerData = {
        name: 'Pedro López',
        email: 'PEDRO@EXAMPLE.COM',
        phone: '+57 302 555 1234',
      };

      const newCustomer = Customer.create(customerData);
      expect(newCustomer.email).toBe('pedro@example.com');
    });

    it('should trim name spaces', () => {
      const customerData = {
        name: '  Carlos Ruiz  ',
        email: 'carlos@test.com',
        phone: '+57 303 444 5678',
      };

      const newCustomer = Customer.create(customerData);
      expect(newCustomer.name).toBe('Carlos Ruiz');
    });

    it('should throw error for invalid email', () => {
      const invalidData = {
        name: 'Ana',
        email: 'invalid-email',
        phone: '+57 300 123 4567',
      };

      expect(() => Customer.create(invalidData)).toThrow('Invalid email format');
    });

    it('should throw error for invalid phone', () => {
      const invalidData = {
        name: 'Luis',
        email: 'luis@test.com',
        phone: '300 123 4567', // Sin +57
      };

      expect(() => Customer.create(invalidData)).toThrow('Invalid phone format');
    });

    it('should throw error for short name', () => {
      const invalidData = {
        name: 'A',
        email: 'a@test.com',
        phone: '+57 300 123 4567',
      };

      expect(() => Customer.create(invalidData)).toThrow('Name must be at least 2 characters');
    });
  });

  describe('fromPersistence Factory', () => {
    it('should create customer from persistence data', () => {
      const persistenceData = {
        id: 5,
        name: 'Rosa Martínez',
        email: 'rosa@test.com',
        phone: '+57 304 111 2222',
        createdAt: new Date('2023-01-15'),
      };

      const customer = Customer.fromPersistence(persistenceData);
      expect(customer.id).toBe(5);
      expect(customer.name).toBe('Rosa Martínez');
      expect(customer.createdAt).toEqual(new Date('2023-01-15'));
    });
  });

  describe('Serialization', () => {
    it('should serialize to primitive correctly', () => {
      const primitive = customer.toPrimitive();
      
      expect(primitive).toHaveProperty('id', 1);
      expect(primitive).toHaveProperty('name', 'Juan Pérez');
      expect(primitive).toHaveProperty('email', 'juan@example.com');
      expect(primitive).toHaveProperty('phone', '+57 300 123 4567');
      expect(primitive).toHaveProperty('maskedEmail', 'j**n@example.com');
      expect(primitive).toHaveProperty('createdAt');
    });
  });
});