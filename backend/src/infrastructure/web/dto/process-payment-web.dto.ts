import { Transform } from 'class-transformer';
import { 
  IsNotEmpty, 
  IsString, 
  Matches, 
  Length,
   
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
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' ')) // Normalizar espacios
  cardHolder: string;
}