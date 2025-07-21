import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';


import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { ApiResponseDto } from 'src/application/dto/response/api-response.dto';
import { ProductApplicationService } from 'src/application/services/product-application.service';
import { ResponseBuilderService } from 'src/application/services/response-builder.service';
import { GetProductsQueryDto } from '../dto/get-products-query.dto';

@Controller('api/products')
@UseFilters(HttpExceptionFilter)
export class ProductController {
  constructor(
    private readonly productApplicationService: ProductApplicationService,
    private readonly responseBuilder: ResponseBuilderService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getProducts(@Query() queryParams: GetProductsQueryDto): Promise<ApiResponseDto> {
    try {
      const request = {
        availableOnly: queryParams.availableOnly,
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      const result = await this.productApplicationService.getProducts(request);

      if (!result.success) {
        return this.responseBuilder.buildError(
          result.error!,
          'Product retrieval failed',
          'PRODUCT_RETRIEVAL_FAILED',
          {
            nextStep: 'RETRY_REQUEST',
            recommendation: 'Please check your query parameters and try again',
          }
        );
      }

      const responseData = {
        products: result.data!.products.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price?.toString() || 0),
          baseFee: Number(product.baseFee?.toString() || 0),
          stock: product.stock,
          imageUrl: product.imageUrl,
          isActive: product.isActive,
          isAvailable: product.isAvailable(),
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        })),
        pagination: {
          total: result.data!.total,
          hasMore: result.data!.hasMore,
          limit: request.limit,
          offset: request.offset,
        },
      };

      return this.responseBuilder.buildSuccess(
        responseData,
        `Retrieved ${result.data!.products.length} products successfully`,
        {
          nextStep: 'DISPLAY_PRODUCTS',
          recommendation: 'Products ready for display',
        }
      );

    } catch (error) {
      return this.responseBuilder.buildUnexpectedError(
        error,
        'ProductController.getProducts'
      );
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getProductById(@Param('id', ParseIntPipe) productId: number): Promise<ApiResponseDto> {
    try {
      const result = await this.productApplicationService.getProductById(productId);

      if (!result.success) {
        const isNotFound = result.error!.includes('not found');
        
        return this.responseBuilder.buildError(
          result.error!,
          `Product retrieval failed for ID ${productId}`,
          isNotFound ? 'PRODUCT_NOT_FOUND' : 'PRODUCT_RETRIEVAL_FAILED',
          {
            nextStep: isNotFound ? 'CHECK_PRODUCT_ID' : 'RETRY_REQUEST',
            recommendation: isNotFound 
              ? 'Please verify the product ID and try again'
              : 'Please try again later',
          }
        );
      }

      const product = result.data!.product;
      const responseData = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price?.toString() || 0),
        baseFee: Number(product.baseFee?.toString() || 0),
        stock: product.stock,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        isAvailable: product.isAvailable(),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };

      return this.responseBuilder.buildSuccess(
        responseData,
        `Product ${product.name} retrieved successfully`,
        {
          nextStep: 'DISPLAY_PRODUCT',
          recommendation: 'Product ready for display or purchase',
        }
      );

    } catch (error) {
      return this.responseBuilder.buildUnexpectedError(
        error,
        'ProductController.getProductById',
        { productId }
      );
    }
  }
}

