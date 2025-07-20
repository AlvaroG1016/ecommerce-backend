// 📁 src/web/dto/get-products-query.dto.ts (NUEVO)
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ProductApplicationService } from 'src/application/services/product-application.service';
import { ResponseBuilderService } from 'src/application/services/response-builder.service';
import { ApiResponseDto } from 'src/application/dto/response/api-response.dto';

export class GetProductsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean({ message: 'availableOnly must be a boolean' })
  availableOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'limit must be a number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'offset must be a number' })
  @Min(0, { message: 'offset must be at least 0' })
  offset?: number;
}