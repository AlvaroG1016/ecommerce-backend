import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';


// Use Cases
import { ProcessPaymentUseCase } from '../../domain/use-cases/process-payment/process-payment.use-case';
import { GetTransactionStatusUseCase } from '../../domain/use-cases/process-payment/gettransactionstatus.use-case';

// External Services
import { PaymentProviderService } from '../external-services/payment-provider/payment-provider.service';
import { PaymentServiceAdapter } from '../external-services/payment-provider/payment-service.adapter';


// Repository implementations
import { PrismaTransactionRepository } from '../database/repositories/prisma-transaction.repository';
import { PrismaProductRepository } from '../database/repositories/prisma-product.repository';

// Repository interfaces (symbols)
import { PAYMENT_SERVICE } from '../../domain/services/payment.service.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/repositories/transaction.repository';
import { PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository';

@Module({
  controllers: [
    PaymentController,
  ],
  providers: [
    // Use Cases
    ProcessPaymentUseCase,
    GetTransactionStatusUseCase,
    
    // ✅ External Services - Core
    PaymentProviderService, // ✅ Asegúrate de incluir este
    
    
    // Payment Service (PORT → ADAPTER)
    {
      provide: PAYMENT_SERVICE,
      useClass: PaymentServiceAdapter,
    },
    
    // Repository implementations (PORTS → ADAPTERS)
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: PrismaTransactionRepository,
    },
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
  exports: [
    ProcessPaymentUseCase, 
    GetTransactionStatusUseCase,

  ],
})
export class PaymentModule {}