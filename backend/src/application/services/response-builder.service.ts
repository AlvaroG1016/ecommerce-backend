import { Injectable, Logger } from '@nestjs/common';
import { ApiResponse, ApiResponseDto } from '../dto/response/api-response.dto';


@Injectable()
export class ResponseBuilderService {
  private readonly logger = new Logger(ResponseBuilderService.name);

  /**
   * 🎯 GENERIC METHOD - Build success response
   * 
   * @param data - Data to return (any type)
   * @param message - Success message for logs
   * @param metadata - Optional metadata for frontend
   */
  buildSuccess<T>(
    data: T,
    message: string,
    metadata?: {
      nextStep?: string;
      recommendation?: string;
      [key: string]: any;
    }
  ): ApiResponseDto {
    // Log success
    this.logger.log(`✅ ${message}`);

    // Default metadata
    const defaultMetadata = {
      nextStep: 'CONTINUE',
      recommendation: 'Operation completed successfully',
    };

    return ApiResponse.success(data, {
      ...defaultMetadata,
      ...metadata,
    });
  }

  /**
   * 🎯 GENERIC METHOD - Build error response
   * 
   * @param error - Error (string or Error object)
   * @param context - Context where it occurred (for logs)
   * @param code - Optional error code
   * @param metadata - Optional metadata for frontend
   */
  buildError(
    error: string | Error,
    context: string,
    code: string = 'OPERATION_FAILED',
    metadata?: {
      nextStep?: string;
      recommendation?: string;
      [key: string]: any;
    }
  ): ApiResponseDto {
    // Extract error message
    const errorMessage = error instanceof Error ? error.message : error;
    
    // Log error with context
    this.logger.error(`❌ ${context}: ${errorMessage}`, {
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Default metadata
    const defaultMetadata = {
      nextStep: 'RETRY_OPERATION',
      recommendation: 'Please try again or contact support',
    };

    return ApiResponse.error(errorMessage, code, {
      ...defaultMetadata,
      ...metadata,
    });
  }

  /**
   * 🎯 GENERIC METHOD - Build unexpected error response
   * 
   * @param error - Error object
   * @param context - Context where it occurred
   * @param additionalInfo - Additional info for debugging
   */
  buildUnexpectedError(
    error: Error,
    context: string,
    additionalInfo?: any
  ): ApiResponseDto {
    // Complete log for debugging
    this.logger.error(`❌ Unexpected error in ${context}: ${error.message}`, {
      stack: error.stack,
      ...additionalInfo,
    });

    return ApiResponse.error(
      'An unexpected error occurred',
      'INTERNAL_ERROR',
      {
        nextStep: 'CONTACT_SUPPORT',
        recommendation: 'Please contact support if this problem persists',
      }
    );
  }

  /**
   * 🎯 HELPER METHOD - Convert domain entities to JSON
   * 
   * Automatically converts Decimal to number and applies other transformations
   */
  private convertEntityToJson(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertEntityToJson(item));
    }

    const result: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        // If it has toString() method and seems to be Decimal, convert to number
        if ('toString' in value && typeof value.toString === 'function') {
          const stringVal = value.toString();
          if (!isNaN(Number(stringVal))) {
            result[key] = Number(stringVal);
            continue;
          }
        }
        // If it's nested object, apply recursion
        result[key] = this.convertEntityToJson(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 🎯 CONVENIENCE METHOD - For when you have domain entities
   * 
   * Automatically converts entities and builds success response
   */
  buildSuccessWithEntities<T>(
    entities: T,
    message: string,
    metadata?: any
  ): ApiResponseDto {
    // Convert entities automatically
    const convertedData = this.convertEntityToJson(entities);
    
    return this.buildSuccess(convertedData, message, metadata);
  }
}
