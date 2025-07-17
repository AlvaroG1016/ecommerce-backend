import { 
  Controller, 
  Get, 
  Query, 
  Param, 
  ParseIntPipe, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { GetProductsUseCase } from '../../../domain/use-cases/get-products/get-products.use-case';

@Controller('api/products')
export class ProductController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
  ) {}

  @Get()
  async getProducts(
    @Query('availableOnly') availableOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const request = {
      availableOnly: availableOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    const result = await this.getProductsUseCase.execute(request);

    if (!result.isSuccess) {
      throw new HttpException(
        {
          error: 'Failed to get products',
          message: result.error?.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: true,
      data: {
        products: result.value!.products.map(product => product.toPrimitive()),
        total: result.value!.total,
        hasMore: result.value!.hasMore,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        availableOnly: request.availableOnly,
        limit: request.limit,
        offset: request.offset,
      },
    };
  }

  @Get(':id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    // Por ahora simple, después podemos crear un GetProductByIdUseCase
    const result = await this.getProductsUseCase.execute();
    
    if (!result.isSuccess) {
      throw new HttpException(
        {
          error: 'Failed to get product',
          message: result.error?.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const product = result.value!.products.find(p => p.id === id);
    
    if (!product) {
      throw new HttpException(
        {
          error: 'Product not found',
          message: `Product with ID ${id} does not exist`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      success: true,
      data: product.toPrimitive(),
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}