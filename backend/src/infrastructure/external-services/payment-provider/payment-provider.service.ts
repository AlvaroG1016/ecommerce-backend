import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto'; 

// DTOs para comunicación con el proveedor de pagos
export interface PaymentProviderRequest {
  amount_in_cents: number;        
  currency: string;               
  customer_email: string;         
  reference: string;              
  acceptance_token: string;           
  accept_personal_auth?: string;      
  signature: string;                  
  payment_method: {
    type: string;                 // "CARD"
    installments: number;         // Número de cuotas (1 = pago único)
    token?: string;               // Token de la tarjeta (cuando ya está tokenizada)
    // Para crear token (solo primera vez):
    number?: string;              // Número de tarjeta (solo para tokenizar)
    cvc?: string;                 // Código CVC (solo para tokenizar)
    exp_month?: string;           // Mes de expiración (solo para tokenizar)
    exp_year?: string;            // Año de expiración (solo para tokenizar)
    card_holder?: string;         // Nombre en la tarjeta (solo para tokenizar)
  };
}

export interface PaymentProviderResponse {
  data: {
    id: string;                   // ID de la transacción en el proveedor
    status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
    reference: string;            // Tu referencia original
    amount_in_cents: number;
    currency: string;
    payment_method_type: string;
    status_message?: string;      // Mensaje si falló
    created_at: string;
  };
}

// ✅ Interface para el acceptance token
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
    // Configuración desde variables de entorno
    this.privateKey = process.env.PAYMENT_PROVIDER_PRIVATE_KEY!;
    this.publicKey = process.env.PAYMENT_PROVIDER_PUBLIC_KEY!;
    this.integrityKey = process.env.PAYMENT_PROVIDER_INTEGRITY_KEY!; 
    this.sandboxUrl = process.env.PAYMENT_PROVIDER_SANDBOX_URL!;

    console.log('🔍 Payment Provider Configuration:');
    console.log('  Private Key:', this.privateKey ? '✅ Present' : '❌ Missing');
    console.log('  Public Key:', this.publicKey ? '✅ Present' : '❌ Missing');
    console.log('  Integrity Key:', this.integrityKey ? '✅ Present' : '❌ Missing'); // ✅ NUEVO
    console.log('  Sandbox URL:', this.sandboxUrl);

    // Cliente HTTP configurado para el proveedor de pagos
    this.httpClient = axios.create({
      baseURL: this.sandboxUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.privateKey}`,
      },
      timeout: 30000,
    });

    console.log('🔗 Payment Provider Service initialized');
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
      // Concatenar datos según formato de Wompi
      const concatenatedString = `${data.reference}${data.amount_in_cents}${data.currency}${this.integrityKey}`;
      
      console.log('🔐 Generating integrity signature for:', {
        reference: data.reference,
        amount: data.amount_in_cents,
        currency: data.currency,
        concatenatedLength: concatenatedString.length,
      });

      // Generar hash SHA256
      const signature = crypto
        .createHash('sha256')
        .update(concatenatedString)
        .digest('hex');

      console.log('✅ Integrity signature generated:', {
        signaturePrefix: signature.substring(0, 16) + '...',
        signatureLength: signature.length,
      });

      return signature;

    } catch (error) {
      console.error('❌ Failed to generate integrity signature:', error.message);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  /**
   * MÉTODO: Obtener acceptance token (OBLIGATORIO)
   * Este método debe ejecutarse ANTES de cualquier transacción
   */
  async getAcceptanceToken(): Promise<WompiMerchantInfo> {
    try {
      console.log('🎫 Getting acceptance token from merchant info...');
      
      // Endpoint según documentación: GET /merchants/:merchant_public_key
      const response = await this.httpClient.get<WompiMerchantInfo>(
        `/merchants/${this.publicKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.publicKey}`, // Usar llave pública para este endpoint
          }
        }
      );

      console.log('✅ Acceptance token obtained:', {
        acceptanceToken: response.data.data.presigned_acceptance.acceptance_token.substring(0, 20) + '...',
        personalDataToken: response.data.data.presigned_personal_data_auth.acceptance_token.substring(0, 20) + '...',
        termsUrl: response.data.data.presigned_acceptance.permalink,
        privacyUrl: response.data.data.presigned_personal_data_auth.permalink,
      });

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

  /**
   *  MÉTODO: Crear token de tarjeta 
   */
  async createCardToken(cardData: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
  }) {
    try {
      console.log('🎫 Creating card token...');
      
      const payload = {
        number: cardData.number.replace(/\s/g, ''),
        cvc: cardData.cvc,
        exp_month: cardData.exp_month.padStart(2, '0'),
        exp_year: cardData.exp_year,
        card_holder: cardData.card_holder.trim(),
      };

      console.log('🔍 Token creation payload:', {
        number: '****-****-****-' + payload.number.slice(-4),
        cvc: '***',
        exp_month: payload.exp_month,
        exp_year: payload.exp_year,
        card_holder: payload.card_holder,
      });

      const response = await this.httpClient.post('/tokens/cards', payload, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`, // Usar llave pública para tokenización
        }
      });

      console.log('✅ Card token created:', {
        id: response.data.data.id,
        status: response.data.status,
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

  /**
   *  MÉTODO PRINCIPAL ACTUALIZADO: Procesar pago (con acceptance token y firma obligatorios)
   */
  async processPayment(paymentData: PaymentProviderRequest): Promise<PaymentProviderResponse> {
    try {
      console.log('🚀 Sending payment to external provider:', {
        amount: paymentData.amount_in_cents,
        reference: paymentData.reference,
        customer: paymentData.customer_email,
        hasAcceptanceToken: !!paymentData.acceptance_token,
        hasSignature: !!paymentData.signature,
        url: `${this.sandboxUrl}/transactions`,
      });

      // Validar que se incluyan todos los campos obligatorios
      if (!paymentData.acceptance_token) {
        throw new Error('acceptance_token is required. Call getAcceptanceToken() first.');
      }

      if (!paymentData.signature) {
        throw new Error('signature is required. Generate integrity signature first.');
      }

      // Debug payload (sin datos sensibles)
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
      console.log('📋 Payload (safe):', JSON.stringify(debugPayload, null, 2));

      // LLAMADA HTTP AL API DEL PROVEEDOR EXTERNO (con llave privada)
      const response = await this.httpClient.post<PaymentProviderResponse>(
        '/transactions',
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${this.privateKey}`, // Llave privada para transacciones
          }
        }
      );

      console.log('✅ Payment provider response received:', {
        status: response.data.data.status,
        id: response.data.data.id,
        reference: response.data.data.reference,
      });

      return response.data;

    } catch (error) {
      console.error('❌ External payment processing failed:');
      console.error('  Status:', error.response?.status);
      console.error('  Error Data:', JSON.stringify(error.response?.data, null, 2));
      
      // Si el proveedor devuelve error, lo transformamos a formato estándar
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

  /**
   *  MÉTODO ACTUALIZADO: Proceso completo de pago con tarjeta nueva (con firma de integridad)
   */
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
      console.log('🔄 Starting complete payment process with new card...');

      // 1. Obtener acceptance token
      const merchantInfo = await this.getAcceptanceToken();

      // 2. Crear token de la tarjeta
      const cardToken = await this.createCardToken(paymentData.cardData);

      // 3. ✅ NUEVO: Generar firma de integridad
      const signature = this.generateIntegritySignature({
        reference: paymentData.reference,
        amount_in_cents: paymentData.amount_in_cents,
        currency: paymentData.currency,
      });

      // 4. Procesar el pago con todos los datos requeridos
      const paymentRequest: PaymentProviderRequest = {
        amount_in_cents: paymentData.amount_in_cents,
        currency: paymentData.currency,
        customer_email: paymentData.customer_email,
        reference: paymentData.reference,
        acceptance_token: merchantInfo.data.presigned_acceptance.acceptance_token,
        accept_personal_auth: merchantInfo.data.presigned_personal_data_auth.acceptance_token,
        signature: signature, // ✅ NUEVO: Incluir firma de integridad
        payment_method: {
          type: 'CARD',
          installments: paymentData.installments || 1,
          token: cardToken.data.id,
        },
      };

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