import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateTransactionWithProviderResultDto {
  @IsString()
  providerTransactionId: string;

  @IsString()
  providerStatus: string; // 'APPROVED', 'DECLINED', 'ERROR', etc.

  @IsString()
  providerMessage: string;

  @IsString()
  providerReference: string;

  @IsDateString()
  providerProcessedAt: string;

  @IsNumber()
  @IsOptional()
  amountInCents?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}