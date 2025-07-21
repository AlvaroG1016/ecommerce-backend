import { 
  IsNotEmpty, 
  IsString, 
  IsEmail, 
  IsNumber, 
  IsPositive,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CardBrand, PaymentMethod } from "src/domain/entities/transaction.entity";

class CustomerDto {
  @IsNotEmpty({ message: 'Customer name is required' })
  @IsString({ message: 'Customer name must be a string' })
  @MinLength(2, { message: 'Customer name must be at least 2 characters' })
  @MaxLength(100, { message: 'Customer name must be less than 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNotEmpty({ message: 'Customer email is required' })
  @IsEmail({}, { message: 'Customer email must be a valid email' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsNotEmpty({ message: 'Customer phone is required' })
  @IsString({ message: 'Customer phone must be a string' })
  @MinLength(8, { message: 'Customer phone must be at least 8 characters' })
  @Transform(({ value }) => value?.trim())
  phone: string;
}

class PaymentDto {
  @IsNotEmpty({ message: 'Payment method is required' })
  @IsEnum(PaymentMethod, { message: 'Payment method must be valid' })
  method: PaymentMethod;

  @IsOptional()
  @IsString({ message: 'Card last four must be a string' })
  @Transform(({ value }) => value?.replace(/\s/g, ''))
  cardLastFour?: string;

  @IsOptional()
  @IsEnum(CardBrand, { message: 'Card brand must be valid' })
  cardBrand?: CardBrand;
}

class DeliveryDto {
  @IsNotEmpty({ message: 'Delivery address is required' })
  @IsString({ message: 'Delivery address must be a string' })
  @MinLength(5, { message: 'Delivery address must be at least 5 characters' })
  @Transform(({ value }) => value?.trim())
  address: string;

  @IsNotEmpty({ message: 'Delivery city is required' })
  @IsString({ message: 'Delivery city must be a string' })
  @MinLength(2, { message: 'Delivery city must be at least 2 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  city: string;

  @IsOptional()
  @IsString({ message: 'Postal code must be a string' })
  @Transform(({ value }) => value?.trim())
  postalCode?: string;

  @IsNotEmpty({ message: 'Delivery phone is required' })
  @IsString({ message: 'Delivery phone must be a string' })
  @MinLength(8, { message: 'Delivery phone must be at least 8 characters' })
  @Transform(({ value }) => value?.trim())
  phone: string;
}

export class CreateTransactionWebDto {
  @ValidateNested({ message: 'Customer data is invalid' })
  @Type(() => CustomerDto)
  @IsNotEmpty({ message: 'Customer data is required' })
  customer: CustomerDto;

  @IsNotEmpty({ message: 'Product ID is required' })
  @IsNumber({}, { message: 'Product ID must be a number' })
  @IsPositive({ message: 'Product ID must be positive' })
  @Type(() => Number)
  productId: number;

  @IsOptional()
  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsPositive({ message: 'Quantity must be positive' })
  @Type(() => Number)
  quantity?: number;

  @ValidateNested({ message: 'Payment data is invalid' })
  @Type(() => PaymentDto)
  @IsNotEmpty({ message: 'Payment data is required' })
  payment: PaymentDto;

  @ValidateNested({ message: 'Delivery data is invalid' })
  @Type(() => DeliveryDto)
  @IsNotEmpty({ message: 'Delivery data is required' })
  delivery: DeliveryDto;
}