import { Module } from '@nestjs/common';
import { TransactionController } from './controllers/transaction.controller';
import { CreateTransactionUseCase } from '../../domain/use-cases/create-transaction/create-transaction.use-case';

// Repository implementations
import { PrismaTransactionRepository } from '../database/repositories/prisma-transaction.repository';
import { PrismaCustomerRepository } from '../database/repositories/prisma-customer.repository';
import { PrismaProductRepository } from '../database/repositories/prisma-product.repository';
import { PrismaDeliveryRepository } from '../database/repositories/prisma-delivery.repository';

// Repository interfaces (symbols)
import { TRANSACTION_REPOSITORY } from '../../domain/repositories/transaction.repository';
import { CUSTOMER_REPOSITORY } from '../../domain/repositories/customer.repository';
import { PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository';
import { DELIVERY_REPOSITORY } from '../../domain/repositories/delivery.repository';

@Module({
  controllers: [TransactionController],
  providers: [
    // Use Cases
    CreateTransactionUseCase,
    
    // Repository implementations (Dependency Injection)
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: PrismaTransactionRepository,
    },
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: PrismaCustomerRepository,
    },
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
    {
      provide: DELIVERY_REPOSITORY,
      useClass: PrismaDeliveryRepository,
    },
  ],
  exports: [CreateTransactionUseCase],
})
export class TransactionModule {}