import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto'; 

export interface PaymentProviderRequest {
  amount_in_cents: number;        
  currency: string;               
  customer_email: string;         
  reference: string;              
  acceptance_token: string;           
  accept_personal_auth?: string;      
  signature: string;                  
  payment_method: {
    type: string;                 
    installments: number;      
    token?: string;               
    number?: string;             
    cvc?: string;                
    exp_month?: string;           
    exp_year?: string;          
    card_holder?: string;         
  };
}

export interface PaymentProviderResponse {
  data: {
    id: string;                  
    status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
    reference: string;           
    amount_in_cents: number;
    currency: string;
    payment_method_type: string;
    status_message?: string;  
    created_at: string;
  };
}

export interface WompiMerchantInfo {
  data: {
    id: number;
    name: string;
    email: string;
    presigned_acceptance: {
      acceptance_token: string;
      permalink: string;
      type: string;
    };
    presigned_personal_data_auth: {
      acceptance_token: string;
      permalink: string;
      type: string;
    };
  };
}

@Injectable()
export class PaymentProviderService {
  private readonly httpClient: AxiosInstance;
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly integrityKey: string;    
  private readonly sandboxUrl: string;

  constructor() {
    this.privateKey = process.env.PAYMENT_PROVIDER_PRIVATE_KEY!;
    this.publicKey = process.env.PAYMENT_PROVIDER_PUBLIC_KEY!;
    this.integrityKey = process.env.PAYMENT_PROVIDER_INTEGRITY_KEY!; 
    this.sandboxUrl = process.env.PAYMENT_PROVIDER_SANDBOX_URL!;
    console.log('🔑 PaymentProviderService initialized with keys:', {
      privateKey: this.privateKey?.substring(0, 20) + '...',
      publicKey: this.publicKey?.substring(0, 20) + '...',
      integrityKey: this.integrityKey?.substring(0, 20) + '...',
      sandboxUrl: this.sandboxUrl
    });

    this.httpClient = axios.create({
      baseURL: this.sandboxUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.privateKey}`,
      },
      timeout: 30000,
    });

  }

  /**
   *  Generar firma de integridad
   * Según documentación : reference + amount_in_cents + currency + integrity_key
   */
  private generateIntegritySignature(data: {
    reference: string;
    amount_in_cents: number;
    currency: string;
  }): string {
    try {
      const concatenatedString = `${data.reference}${data.amount_in_cents}${data.currency}${this.integrityKey}`;
      
  

      const signature = crypto
        .createHash('sha256')
        .update(concatenatedString)
        .digest('hex');

     

      return signature;

    } catch (error) {
      console.error('❌ Failed to generate integrity signature:', error.message);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }


  async getAcceptanceToken(): Promise<WompiMerchantInfo> {
    try {
      console.log('🎫 Getting acceptance token from merchant info...',this.publicKey);
      
      const response = await this.httpClient.get<WompiMerchantInfo>(
        `/merchants/${this.publicKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.publicKey}`,
          }
        }
      );

    console.log('🏪 Acceptance token retrieved:', response);
      return response.data;

    } catch (error) {
      console.error('❌ Failed to get acceptance token:');
      console.error('  Status:', error.response?.status);
      console.error('  Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('  Request URL:', error.config?.url);
      console.error('  Public Key used:', this.publicKey?.substring(0, 20) + '...');
      
      throw new Error(`Acceptance token retrieval failed: ${error.message}`);
    }
  }

  async getAcceptanceTokenSimple(): Promise<any> {
  try {
    const endpoint = `${this.sandboxUrl}/merchants/${this.publicKey}`;
    const headers = {
      'Authorization': `Bearer ${this.publicKey}`,
    };

    // Imprimimos la URL y los headers antes de hacer la solicitud
    console.log('🔑 Sending request to get acceptance token with URL:', endpoint);
    console.log('🔑 Headers:', headers);

    // Realizamos la solicitud de prueba
    const response = await this.httpClient.get(endpoint, { headers });
    
    // Imprimimos la respuesta para ver si hay algún error
    console.log('🎉 Response received:', response.data);

  } catch (error) {
    // Log de errores con más detalles
    console.error('❌ Failed to get acceptance token:');
    console.error('  Status:', error.response?.status);
    console.error('  Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('  Request URL:', error.config?.url);
    console.error('  Public Key used:', this.publicKey?.substring(0, 20) + '...');
  }
}


  async createCardToken(cardData: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
  }) {
    try {
      
      const payload = {
        number: cardData.number.replace(/\s/g, ''),
        cvc: cardData.cvc,
        exp_month: cardData.exp_month.padStart(2, '0'),
        exp_year: cardData.exp_year,
        card_holder: cardData.card_holder.trim(),
      };

     

      const response = await this.httpClient.post('/tokens/cards', payload, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`, 
        }
      });



      return response.data;

    } catch (error) {
      console.error('❌ Failed to create card token:');
      console.error('  Status:', error.response?.status);
      console.error('  Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('  Request URL:', error.config?.url);
      
      throw new Error(`Token creation failed: ${error.message}`);
    }
  }

  async processPayment(paymentData: PaymentProviderRequest): Promise<PaymentProviderResponse> {
    try {
      

      if (!paymentData.acceptance_token) {
        throw new Error('acceptance_token is required. Call getAcceptanceToken() first.');
      }

      if (!paymentData.signature) {
        throw new Error('signature is required. Generate integrity signature first.');
      }

      const debugPayload = {
        ...paymentData,
        acceptance_token: paymentData.acceptance_token.substring(0, 20) + '...',
        accept_personal_auth: paymentData.accept_personal_auth?.substring(0, 20) + '...',
        signature: paymentData.signature.substring(0, 16) + '...',
        payment_method: {
          type: paymentData.payment_method.type,
          installments: paymentData.payment_method.installments,
          token: paymentData.payment_method.token ? '***TOKEN***' : 'NOT_PROVIDED',
        }
      };
      debugger

      const response = await this.httpClient.post<PaymentProviderResponse>(
        '/transactions',
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${this.privateKey}`, 
          }
        }
      );

     

      return response.data;

    } catch (error) {
      console.error('❌ External payment processing failed:');
      console.error('  Status:', error.response?.status);
      console.error('  Error Data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data) {
        return {
          data: {
            id: '',
            status: 'ERROR',
            reference: paymentData.reference,
            amount_in_cents: paymentData.amount_in_cents,
            currency: paymentData.currency,
            payment_method_type: 'CARD',
            status_message: error.response.data.error?.reason || JSON.stringify(error.response.data),
            created_at: new Date().toISOString(),
          },
        };
      }

      throw new Error(`Payment provider error: ${error.message}`);
    }
  }


  async processPaymentWithNewCard(paymentData: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    reference: string;
    cardData: {
      number: string;
      cvc: string;
      exp_month: string;
      exp_year: string;
      card_holder: string;
    };
    installments?: number;
  }): Promise<PaymentProviderResponse> {
    try {

      const merchantInfo = await this.getAcceptanceTokenSimple();
console.log('🏪 Merchant info retrieved:', merchantInfo.data.id);
      const cardToken = await this.createCardToken(paymentData.cardData);
      console.log('💳 Card token created:', cardToken.data.id);
      const signature = this.generateIntegritySignature({
        reference: paymentData.reference,
        amount_in_cents: paymentData.amount_in_cents,
        currency: paymentData.currency,
      });
console.log('🔑 Integrity signature generated:', signature);
      const paymentRequest: PaymentProviderRequest = {
        amount_in_cents: paymentData.amount_in_cents,
        currency: paymentData.currency,
        customer_email: paymentData.customer_email,
        reference: paymentData.reference,
        acceptance_token: merchantInfo.data.presigned_acceptance.acceptance_token,
        accept_personal_auth: merchantInfo.data.presigned_personal_data_auth.acceptance_token,
        signature: signature, 
        payment_method: {
          type: 'CARD',
          installments: paymentData.installments || 1,
          token: cardToken.data.id,
        },
      };
      debugger
      return await this.processPayment(paymentRequest);

    } catch (error) {
      console.error('❌ Complete payment process failed:', error.message);
      throw error;
    }
  }

  //  MÉTODOS AUXILIARES 
  async getTransactionStatus(providerTransactionId: string): Promise<PaymentProviderResponse> {
    try {
      const response = await this.httpClient.get<PaymentProviderResponse>(
        `/transactions/${providerTransactionId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get transaction status:', error.message);
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  generateReference(transactionId: number): string {
    const timestamp = Date.now();
    return `TXN-${transactionId}-${timestamp}`;
  }

  convertToCents(amountInPesos: number): number {
    return Math.round(amountInPesos * 100);
  }

  isValidTestCard(cardNumber: string): boolean {
    const testCards = [
      '4242424242424242', // VISA que siempre aprueba
      '4000000000000002', // VISA que siempre rechaza
      '5555555555554444', // MASTERCARD que siempre aprueba
      '2223003122003222', // MASTERCARD que siempre rechaza
    ];
    const cleanNumber = cardNumber.replace(/\s/g, '');
    return testCards.includes(cleanNumber);
  }

  getTestCards() {
    return {
      visa_approved: '4242424242424242',
      visa_declined: '4000000000000002',
      mastercard_approved: '5555555555554444',
      mastercard_declined: '2223003122003222',
    };
  }
}