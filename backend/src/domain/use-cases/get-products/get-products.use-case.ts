import { Injectable, Inject } from '@nestjs/common';
import { Product } from '../../entities/product.entity';
import { ProductRepository, PRODUCT_REPOSITORY } from '../../repositories/product.repository';

// Railway Oriented Programming (ROP) - Result pattern
export class Result<T, E = Error> {
  constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: E,
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  static failure<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  static fromPromise<T>(promise: Promise<T>): Promise<Result<T>> {
    return promise
      .then((value) => Result.success(value))
      .catch((error) => Result.failure(error));
  }
}

// DTO para el caso de uso
export interface GetProductsRequest {
  availableOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetProductsResponse {
  products: Product[];
  total: number;
  hasMore: boolean;
}

// Caso de uso implementando ROP
@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(request: GetProductsRequest = {}): Promise<Result<GetProductsResponse>> {
    try {
      // Validaciones de entrada
      const validationResult = this.validateRequest(request);
      if (!validationResult.isSuccess) {
        return Result.failure<GetProductsResponse, Error>(validationResult.error as Error);
      }

      // Obtener productos según los filtros
      const products = request.availableOnly 
        ? await this.productRepository.findAvailable()
        : await this.productRepository.findAll();

      // Aplicar paginación si se solicita
      const paginatedProducts = this.applyPagination(products, request);
      
      // Calcular metadatos
      const response: GetProductsResponse = {
        products: paginatedProducts,
        total: products.length,
        hasMore: this.hasMoreProducts(products, request),
      };

      return Result.success(response);

    } catch (error) {
      return Result.failure(
        new Error(`Failed to get products: ${error.message}`)
      );
    }
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

  private applyPagination(products: Product[], request: GetProductsRequest): Product[] {
    const { limit, offset = 0 } = request;
    
    if (limit === undefined) {
      return products.slice(offset);
    }

    return products.slice(offset, offset + limit);
  }

  private hasMoreProducts(products: Product[], request: GetProductsRequest): boolean {
    const { limit, offset = 0 } = request;
    
    if (limit === undefined) {
      return false;
    }

    return products.length > offset + limit;
  }
}