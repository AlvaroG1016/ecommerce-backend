import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { CreateTransactionUseCase } from '../../../domain/use-cases/create-transaction/create-transaction.use-case';
import { PaymentMethod, CardBrand } from '../../../domain/entities/transaction.entity';

// DTOs para validación web
export class CreateTransactionWebDto {
  customer: {
    name: string;
    email: string;
    phone: string;
  };

  productId: number;
  quantity?: number;

  payment: {
    method: PaymentMethod;
    cardLastFour?: string;
    cardBrand?: CardBrand;
  };

  delivery: {
    address: string;
    city: string;
    postalCode?: string;
    phone: string;
  };
}

@Controller('api/transactions')
export class TransactionController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
  ) {}

  @Post()
  async createTransaction(@Body(ValidationPipe) body: CreateTransactionWebDto) {
    const result = await this.createTransactionUseCase.execute({
      customer: {
        name: body.customer.name,
        email: body.customer.email,
        phone: body.customer.phone,
      },
      productId: body.productId,
      quantity: body.quantity || 1,
      payment: {
        method: body.payment.method,
        cardLastFour: body.payment.cardLastFour,
        cardBrand: body.payment.cardBrand,
      },
      delivery: {
        address: body.delivery.address,
        city: body.delivery.city,
        postalCode: body.delivery.postalCode,
        phone: body.delivery.phone,
      },
    });

    if (!result.isSuccess) {
      throw new HttpException(
        {
          error: 'Failed to create transaction',
          message: result.error?.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const response = result.value!;

    return {
      success: true,
      data: {
        transaction: response.transaction.toPrimitive(),
        customer: response.customer.toPrimitive(),
        product: response.product.toPrimitive(),
        delivery: response.delivery.toPrimitive(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        nextStep: 'PAYMENT_PROCESSING',
      },
    };
  }

  @Get(':id')
  async getTransaction(@Param('id', ParseIntPipe) id: number) {
    // TODO: Implementar GetTransactionByIdUseCase después
    return {
      success: true,
      data: {
        id,
        status: 'PENDING',
        message: 'Transaction details endpoint - TODO',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get()
  async getTransactions() {
    // TODO: Implementar GetTransactionsUseCase después
    return {
      success: true,
      data: {
        transactions: [],
        total: 0,
        message: 'List transactions endpoint - TODO',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}