import { Injectable, Logger } from '@nestjs/common';
import { GetProductsUseCase } from '../use-cases/get-products/get-products.use-case';
import { GetProductsRequest } from '../dto/request/get-products.request.dto';
import { GetProductsResponse } from '../dto/response/get-products.response.dto';
import { GetProductByIdResponse } from '../dto/response/get-productById.response.dto';


@Injectable()
export class ProductApplicationService {
  private readonly logger = new Logger(ProductApplicationService.name);

  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
  ) {}

 
  async getProducts(request: GetProductsRequest = {}): Promise<{
    success: boolean;
    data?: GetProductsResponse;
    error?: string;
  }> {
    this.logger.log('Application service getting products', {
      availableOnly: request.availableOnly,
      limit: request.limit,
      offset: request.offset,
    });

    try {
      const result = await this.getProductsUseCase.execute(request);

      if (!result.isSuccess) {
        return {
          success: false,
          error: result.error?.message || 'Failed to get products',
        };
      }

      this.logger.log(` Retrieved ${result.value!.products.length} products`);

      return {
        success: true,
        data: result.value!,
      };

    } catch (error) {
      this.logger.error(`Application service error: ${error.message}`);
      return {
        success: false,
        error: 'An unexpected error occurred while getting products',
      };
    }
  }

  
  async getProductById(productId: number): Promise<{
    success: boolean;
    data?: GetProductByIdResponse;
    error?: string;
  }> {
    this.logger.log(`Application service getting product by ID: ${productId}`);

    try {
      const result = await this.getProductsUseCase.executeGetById({ productId });

      if (!result.isSuccess) {
        const isNotFound = result.error?.message.includes('not found');
        
        return {
          success: false,
          error: result.error?.message || 'Failed to get product',
        };
      }

      this.logger.log(`✅ Retrieved product: ${result.value!.product.name}`);

      return {
        success: true,
        data: result.value!,
      };

    } catch (error) {
      this.logger.error(`Application service error: ${error.message}`);
      return {
        success: false,
        error: 'An unexpected error occurred while getting product',
      };
    }
  }


  async validateProductAvailability(productId: number): Promise<{
    success: boolean;
    data?: { isAvailable: boolean; product?: any };
    error?: string;
  }> {
    try {
      const result = await this.getProductById(productId);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      const product = result.data!.product;
      const isAvailable = product.isAvailable();

      return {
        success: true,
        data: {
          isAvailable,
          product: isAvailable ? product : undefined,
        },
      };

    } catch (error) {
      this.logger.error(`Error validating product availability: ${error.message}`);
      return {
        success: false,
        error: 'Failed to validate product availability',
      };
    }
  }
}