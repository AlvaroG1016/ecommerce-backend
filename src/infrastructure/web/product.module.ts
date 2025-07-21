import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { PrismaProductRepository } from '../database/repositories/prisma-product.repository';
import { PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository';
import { GetProductsUseCase } from 'src/application/use-cases/get-products/get-products.use-case';
import { ProductApplicationService } from 'src/application/services/product-application.service';

@Module({
  controllers: [ProductController],
  providers: [
    GetProductsUseCase,
    ProductApplicationService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
  exports: [GetProductsUseCase],
})
export class ProductModule {}