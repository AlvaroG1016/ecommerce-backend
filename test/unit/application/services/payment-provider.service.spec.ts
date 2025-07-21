import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import * as crypto from 'crypto';
import { PaymentProviderRequest, PaymentProviderResponse, PaymentProviderService, WompiMerchantInfo } from 'src/infrastructure/external-services/payment-provider/payment-provider.service';
// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentProviderService', () => {
  let service: PaymentProviderService;
  let mockAxiosInstance: any;

  // Mock environment variables
  const mockEnv = {
    PAYMENT_PROVIDER_PRIVATE_KEY: 'prv_test_mock_private_key_12345',
    PAYMENT_PROVIDER_PUBLIC_KEY: 'pub_test_mock_public_key_12345',
    PAYMENT_PROVIDER_INTEGRITY_KEY: 'test_mock_integrity_key_12345',
    PAYMENT_PROVIDER_SANDBOX_URL: 'https://sandbox-api.wompi.co/v1',
  };

  beforeEach(async () => {
    // Set environment variables
    Object.assign(process.env, mockEnv);

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentProviderService],
    }).compile();

    service = module.get<PaymentProviderService>(PaymentProviderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(service).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockEnv.PAYMENT_PROVIDER_SANDBOX_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockEnv.PAYMENT_PROVIDER_PRIVATE_KEY}`,
        },
        timeout: 30000,
      });
    });
  });

  describe('generateIntegritySignature', () => {
    it('should generate correct integrity signature', () => {
      const data = {
        reference: 'TXN-123',
        amount_in_cents: 50000,
        currency: 'COP',
      };

      const signature = (service as any).generateIntegritySignature(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex length
    });
  });

  describe('getAcceptanceToken', () => {
    it('should successfully get acceptance token', async () => {
      const mockResponse = {
        data: {
          id: 12345,
          name: 'Test Merchant',
          email: 'merchant@test.com',
          presigned_acceptance: {
            acceptance_token: 'djE6NjIyMGQ4M...',
            permalink: 'https://wompi.co/terms',
            type: 'END_USER_POLICY',
          },
          presigned_personal_data_auth: {
            acceptance_token: 'djE6NjIyMGQ5N...',
            permalink: 'https://wompi.co/privacy',
            type: 'PERSONAL_DATA_AUTH_POLICY',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getAcceptanceToken();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/merchants/${mockEnv.PAYMENT_PROVIDER_PUBLIC_KEY}`,
        {
          headers: {
            'Authorization': `Bearer ${mockEnv.PAYMENT_PROVIDER_PUBLIC_KEY}`,
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when acceptance token request fails', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
        config: { url: '/merchants/pub_test_mock_public_key_12345' },
        message: 'Request failed with status code 401',
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(service.getAcceptanceToken()).rejects.toThrow(
        'Acceptance token retrieval failed: Request failed with status code 401'
      );
    });
  });

  describe('getAcceptanceTokenSimple', () => {
    it('should make request with correct parameters', async () => {
      const mockResponse = { data: { id: 12345 } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await service.getAcceptanceTokenSimple();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `${mockEnv.PAYMENT_PROVIDER_SANDBOX_URL}/merchants/${mockEnv.PAYMENT_PROVIDER_PUBLIC_KEY}`,
        {
          headers: {
            'Authorization': `Bearer ${mockEnv.PAYMENT_PROVIDER_PUBLIC_KEY}`,
          },
        }
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = {
        response: { status: 404, data: { error: 'Not found' } },
        config: { url: '/merchants/test' },
        message: 'Not found',
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(service.getAcceptanceTokenSimple()).resolves.toBeUndefined();
    });
  });

  describe('createCardToken', () => {
    it('should create card token successfully', async () => {
      const cardData = {
        number: '4242 4242 4242 4242',
        cvc: '123',
        exp_month: '12',
        exp_year: '2025',
        card_holder: 'John Doe',
      };

      const mockResponse = {
        data: {
          id: 'tok_test_22222_11111111',
          status: 'CREATED',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await service.createCardToken(cardData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/tokens/cards',
        {
          number: '4242424242424242',
          cvc: '123',
          exp_month: '12',
          exp_year: '2025',
          card_holder: 'John Doe',
        },
        {
          headers: {
            'Authorization': `Bearer ${mockEnv.PAYMENT_PROVIDER_PUBLIC_KEY}`,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle card number with spaces and padding', async () => {
      const cardData = {
        number: '4242 4242 4242 4242',
        cvc: '123',
        exp_month: '1',
        exp_year: '2025',
        card_holder: '  John Doe  ',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'token_123' } });

      await service.createCardToken(cardData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/tokens/cards',
        expect.objectContaining({
          number: '4242424242424242',
          exp_month: '01',
          card_holder: 'John Doe',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when token creation fails', async () => {
      const cardData = {
        number: '4242424242424242',
        cvc: '123',
        exp_month: '12',
        exp_year: '2025',
        card_holder: 'John Doe',
      };

      const mockError = {
        response: {
          status: 400,
          data: { error: 'Invalid card' },
        },
        config: { url: '/tokens/cards' },
        message: 'Bad request',
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(service.createCardToken(cardData)).rejects.toThrow(
        'Token creation failed: Bad request'
      );
    });
  });

  describe('processPayment', () => {
    const mockPaymentData: PaymentProviderRequest = {
      amount_in_cents: 50000,
      currency: 'COP',
      customer_email: 'test@example.com',
      reference: 'TXN-123',
      acceptance_token: 'djE6NjIyMGQ4M...',
      accept_personal_auth: 'djE6NjIyMGQ5N...',
      signature: 'signature123',
      payment_method: {
        type: 'CARD',
        installments: 1,
        token: 'tok_test_22222_11111111',
      },
    };

    it('should process payment successfully', async () => {
      const mockResponse = {
        data: {
          id: 'txn_12345',
          status: 'APPROVED',
          reference: 'TXN-123',
          amount_in_cents: 50000,
          currency: 'COP',
          payment_method_type: 'CARD',
          created_at: '2024-01-01T10:00:00Z',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await service.processPayment(mockPaymentData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/transactions',
        mockPaymentData,
        {
          headers: {
            'Authorization': `Bearer ${mockEnv.PAYMENT_PROVIDER_PRIVATE_KEY}`,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when acceptance_token is missing', async () => {
      const paymentDataWithoutToken = { ...mockPaymentData, acceptance_token: '' };

      await expect(service.processPayment(paymentDataWithoutToken)).rejects.toThrow(
        'acceptance_token is required. Call getAcceptanceToken() first.'
      );
    });

    it('should throw error when signature is missing', async () => {
      const paymentDataWithoutSignature = { ...mockPaymentData, signature: '' };

      await expect(service.processPayment(paymentDataWithoutSignature)).rejects.toThrow(
        'signature is required. Generate integrity signature first.'
      );
    });

    it('should return error response when payment fails', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: { reason: 'Card declined' } },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      const result = await service.processPayment(mockPaymentData);

      expect(result.data.status).toBe('ERROR');
      expect(result.data.status_message).toBe('Card declined');
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully', async () => {
      const mockResponse = {
        data: {
          id: 'txn_12345',
          status: 'APPROVED',
          reference: 'TXN-123',
          amount_in_cents: 50000,
          currency: 'COP',
          payment_method_type: 'CARD',
          created_at: '2024-01-01T10:00:00Z',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getTransactionStatus('txn_12345');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/transactions/txn_12345');
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when transaction status request fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getTransactionStatus('txn_12345')).rejects.toThrow(
        'Failed to get transaction status: Network error'
      );
    });
  });

  describe('utility methods', () => {
    describe('generateReference', () => {
      it('should generate reference with transaction ID and timestamp', () => {
        const transactionId = 123;
        const reference = service.generateReference(transactionId);

        expect(reference).toMatch(/^TXN-123-\d+$/);
        expect(reference).toContain('TXN-123-');
      });
    });

    describe('convertToCents', () => {
      it('should convert pesos to cents correctly', () => {
        expect(service.convertToCents(500)).toBe(50000);
        expect(service.convertToCents(1000)).toBe(100000);
        expect(service.convertToCents(10.5)).toBe(1050);
      });

      it('should round to nearest cent', () => {
        expect(service.convertToCents(10.555)).toBe(1056);
        expect(service.convertToCents(10.554)).toBe(1055);
      });
    });

    describe('isValidTestCard', () => {
      it('should validate test cards correctly', () => {
        expect(service.isValidTestCard('4242424242424242')).toBe(true);
        expect(service.isValidTestCard('4000000000000002')).toBe(true);
        expect(service.isValidTestCard('5555555555554444')).toBe(true);
        expect(service.isValidTestCard('2223003122003222')).toBe(true);
        expect(service.isValidTestCard('1234567890123456')).toBe(false);
      });

      it('should handle cards with spaces', () => {
        expect(service.isValidTestCard('4242 4242 4242 4242')).toBe(true);
        expect(service.isValidTestCard('4000 0000 0000 0002')).toBe(true);
      });
    });

    describe('getTestCards', () => {
      it('should return test card numbers', () => {
        const testCards = service.getTestCards();

        expect(testCards).toEqual({
          visa_approved: '4242424242424242',
          visa_declined: '4000000000000002',
          mastercard_approved: '5555555555554444',
          mastercard_declined: '2223003122003222',
        });
      });
    });
  });

  describe('processPaymentWithNewCard', () => {
    it('should throw error when getAcceptanceTokenSimple fails', async () => {
      const paymentData = {
        amount_in_cents: 50000,
        currency: 'COP',
        customer_email: 'test@example.com',
        reference: 'TXN-123',
        cardData: {
          number: '4242424242424242',
          cvc: '123',
          exp_month: '12',
          exp_year: '2025',
          card_holder: 'John Doe',
        },
      };

      // Mock getAcceptanceTokenSimple to return undefined (which is what it does on error)
      jest.spyOn(service, 'getAcceptanceTokenSimple').mockResolvedValue(undefined);

      // This should throw an error when trying to access merchantInfo.data.id
      await expect(service.processPaymentWithNewCard(paymentData)).rejects.toThrow();
    });

    it('should call getAcceptanceTokenSimple during payment flow', async () => {
      const paymentData = {
        amount_in_cents: 50000,
        currency: 'COP',
        customer_email: 'test@example.com',
        reference: 'TXN-123',
        cardData: {
          number: '4242424242424242',
          cvc: '123',
          exp_month: '12',
          exp_year: '2025',
          card_holder: 'John Doe',
        },
      };

      const spy = jest.spyOn(service, 'getAcceptanceTokenSimple').mockResolvedValue(undefined);

      try {
        await service.processPaymentWithNewCard(paymentData);
      } catch (error) {
        // Expected to fail, but we still verify the method was called
      }

      expect(spy).toHaveBeenCalled();
    });
  });
});