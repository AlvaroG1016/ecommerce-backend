import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { GetProductsUseCase } from '../../domain/use-cases/get-products/get-products.use-case';
import { PrismaProductRepository } from '../database/repositories/prisma-product.repository';
import { PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository';

@Module({
  controllers: [ProductController],
  providers: [
    GetProductsUseCase,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
  exports: [GetProductsUseCase],
})
export class ProductModule {}