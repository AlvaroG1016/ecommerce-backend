import { Transform } from 'class-transformer';
import { 
  IsNotEmpty, 
  IsString, 
  Matches, 
  Length,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max
} from 'class-validator';

export class ProcessPaymentWebDto {
  @IsNotEmpty({ message: 'Card number is required' })
  @IsString()
  @Matches(/^\d{13,19}$/, { 
    message: 'Card number must be between 13-19 digits' 
  })
  @Transform(({ value }) => value?.replace(/\s/g, '')) // Limpiar espacios
  cardNumber: string;

  @IsNotEmpty({ message: 'CVC is required' })
  @IsString()
  @Matches(/^\d{3,4}$/, { 
    message: 'CVC must be 3 or 4 digits' 
  })
  cardCvc: string;

  @IsNotEmpty({ message: 'Expiration month is required' })
  @Matches(/^(0[1-9]|1[0-2])$/, { 
    message: 'Month must be 01-12' 
  })
  cardExpMonth: string;

  @IsNotEmpty({ message: 'Expiration year is required' })
  cardExpYear: string;

  @IsNotEmpty({ message: 'Card holder name is required' })
  @IsString()
  @Length(2, 50, { 
    message: 'Card holder name must be between 2 and 50 characters' 
  })
  @Matches(/^[a-zA-Z\s]+$/, { 
    message: 'Card holder name can only contain letters and spaces' 
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' ')) 
  cardHolder: string;

  @IsOptional()
  @IsNumber({}, { message: 'Installments must be a number' })
  @Min(1, { message: 'Installments must be at least 1' })
  @Max(36, { message: 'Installments cannot exceed 36' })
  @IsIn([1, 3, 6, 9, 12, 18, 24, 36], { 
    message: 'Installments must be one of: 1, 3, 6, 9, 12, 18, 24, 36' 
  })
  @Transform(({ value }) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 1 : parsed; 
  })
  installments?: number;
}