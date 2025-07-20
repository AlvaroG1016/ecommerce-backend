import { Injectable, Inject } from '@nestjs/common';
import { GetProductByIdRequest } from 'src/application/dto/request/get-productById.request.dto';
import { GetProductsRequest } from 'src/application/dto/request/get-products.request.dto';
import { GetProductByIdResponse } from 'src/application/dto/response/get-productById.response.dto';
import { GetProductsResponse } from 'src/application/dto/response/get-products.response.dto';
import { Product } from 'src/domain/entities/product.entity';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/domain/repositories/product.repository';
import { Result } from 'src/shared/utils/result.util';


@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(request: GetProductsRequest = {}): Promise<Result<GetProductsResponse>> {
    const validationResult = this.validateRequest(request);
    if (!validationResult.isSuccess) {
      return Result.failure(validationResult.error!);
    }

    const productsResult = await this.getProducts(request);
    if (!productsResult.isSuccess) {
      return Result.failure(productsResult.error!);
    }
    const products = productsResult.value!;

    const paginatedProductsResult = this.applyPagination(products, request);
    if (!paginatedProductsResult.isSuccess) {
      return Result.failure(paginatedProductsResult.error!);
    }
    const paginatedProducts = paginatedProductsResult.value!;

    const metadataResult = this.calculateMetadata(products, request);
    if (!metadataResult.isSuccess) {
      return Result.failure(metadataResult.error!);
    }
    const metadata = metadataResult.value!;

    const response: GetProductsResponse = {
      products: paginatedProducts,
      total: metadata.total,
      hasMore: metadata.hasMore,
    };

    return Result.success(response);
  }

  async executeGetById(request: GetProductByIdRequest): Promise<Result<GetProductByIdResponse>> {
    const validationResult = this.validateProductId(request.productId);
    if (!validationResult.isSuccess) {
      return Result.failure(validationResult.error!);
    }

    const productResult = await this.getProductById(request.productId);
    if (!productResult.isSuccess) {
      return Result.failure(productResult.error!);
    }
    const product = productResult.value!;

    if (!product) {
      return Result.failure(new Error(`Product with ID ${request.productId} not found`));
    }

    return Result.success({ product });
  }

  private validateRequest(request: GetProductsRequest): Result<void> {
    if (request.limit !== undefined && request.limit < 1) {
      return Result.failure(new Error('Limit must be greater than 0'));
    }

    if (request.offset !== undefined && request.offset < 0) {
      return Result.failure(new Error('Offset must be greater than or equal to 0'));
    }

    if (request.limit !== undefined && request.limit > 100) {
      return Result.failure(new Error('Limit cannot exceed 100 items'));
    }

    return Result.success(undefined);
  }

  private validateProductId(productId: number): Result<void> {
    if (!productId || productId <= 0) {
      return Result.failure(new Error('Valid product ID is required'));
    }

    return Result.success(undefined);
  }

  private async getProducts(request: GetProductsRequest): Promise<Result<Product[]>> {
    const operation = request.availableOnly
      ? () => this.productRepository.findAvailable()
      : () => this.productRepository.findAll();

    return this.safeAsyncCall(operation, 'Failed to retrieve products');
  }

  private async getProductById(productId: number): Promise<Result<Product | null>> {
    return this.safeAsyncCall(
      () => this.productRepository.findById(productId),
      'Failed to retrieve product'
    );
  }

  private applyPagination(products: Product[], request: GetProductsRequest): Result<Product[]> {
    try {
      const { limit, offset = 0 } = request;

      if (limit === undefined) {
        return Result.success(products.slice(offset));
      }

      return Result.success(products.slice(offset, offset + limit));
    } catch (error) {
      return Result.failure(new Error(`Failed to apply pagination: ${error.message}`));
    }
  }

  private calculateMetadata(products: Product[], request: GetProductsRequest): Result<{
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { limit, offset = 0 } = request;
      
      const hasMore = limit !== undefined ? products.length > offset + limit : false;

      return Result.success({
        total: products.length,
        hasMore,
      });
    } catch (error) {
      return Result.failure(new Error(`Failed to calculate metadata: ${error.message}`));
    }
  }

  private async safeAsyncCall<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<Result<T>> {
    try {
      const result = await operation();
      return Result.success(result);
    } catch (error) {
      return Result.failure(new Error(`${errorMessage}: ${error.message}`));
    }
  }
}