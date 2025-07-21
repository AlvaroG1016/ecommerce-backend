import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';


import { PaymentProviderService } from '../external-services/payment-provider/payment-provider.service';
import { PaymentServiceAdapter } from '../external-services/payment-provider/payment-service.adapter';

import { PrismaTransactionRepository } from '../database/repositories/prisma-transaction.repository';
import { PrismaProductRepository } from '../database/repositories/prisma-product.repository';

import { PAYMENT_SERVICE } from '../../domain/services/payment.service.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/repositories/transaction.repository';
import { PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository';
import { PaymentApplicationService } from 'src/application/services/payment-application.service';
import { GetTransactionStatusUseCase } from 'src/application/use-cases/get-transaction-status/gettransactionstatus.use-case';
import { ProcessPaymentUseCase } from 'src/application/use-cases/process-payment/process-payment.use-case';
import { CUSTOMER_REPOSITORY } from 'src/domain/repositories/customer.repository';
import { PrismaCustomerRepository } from '../database/repositories/prisma-customer.repository';
import { UpdateProductStockUseCase } from 'src/application/use-cases/update-stock/update-product-stock.use-case';

@Module({
  controllers: [PaymentController],
  providers: [
    ProcessPaymentUseCase,
    GetTransactionStatusUseCase,
    UpdateProductStockUseCase,
    PaymentProviderService, 
    PaymentApplicationService,

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
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: PrismaCustomerRepository,
    },
  ],
  exports: [
    ProcessPaymentUseCase,
    GetTransactionStatusUseCase,
    
    UpdateProductStockUseCase
  ],
})
export class PaymentModule {}
