import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../../../application/dto/response/api-response.dto';  

@Catch(Error)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = this.getStatusCode(exception);
    
    this.logger.error(`Domain Exception: ${exception.message}`, {
      url: request.url,
      method: request.method,
      stack: exception.stack,
    });

    const apiResponse = ApiResponse.error(
      exception.message,
      'DOMAIN_ERROR',
      {
        nextStep: this.getNextStepForError(exception),
        recommendation: this.getRecommendationForError(exception),
      }
    );

    response.status(statusCode).json(apiResponse);
  }

  private getStatusCode(exception: Error): number {
    const message = exception.message.toLowerCase();
    
    if (message.includes('not found')) {
      return HttpStatus.NOT_FOUND;
    }
    
    if (message.includes('already exists') || message.includes('duplicate')) {
      return HttpStatus.CONFLICT;
    }
    
    if (message.includes('invalid') || message.includes('required')) {
      return HttpStatus.BAD_REQUEST;
    }
    
    if (message.includes('not available') || message.includes('stock')) {
      return HttpStatus.CONFLICT;
    }
    
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getNextStepForError(exception: Error): string {
    const message = exception.message.toLowerCase();
    
    if (message.includes('not found')) {
      return 'CHECK_ID';
    }
    
    if (message.includes('not available') || message.includes('stock')) {
      return 'REFRESH_PRODUCTS';
    }
    
    if (message.includes('invalid') || message.includes('required')) {
      return 'FIX_INPUT';
    }
    
    return 'RETRY_LATER';
  }

  private getRecommendationForError(exception: Error): string {
    const message = exception.message.toLowerCase();
    
    if (message.includes('not found')) {
      return 'Verify the ID and try again';
    }
    
    if (message.includes('not available')) {
      return 'Try a different product or check availability';
    }
    
    if (message.includes('invalid') || message.includes('required')) {
      return 'Please check your input data';
    }
    
    return 'Please try again later or contact support';
  }
}