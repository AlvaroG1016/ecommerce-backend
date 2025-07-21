import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from 'src/application/dto/response/api-response.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    debugger
    const errorResponse = exception.getResponse();
    let message = 'Internal server error';

    if (typeof errorResponse === 'string') {
      message = errorResponse;
    } else if (errorResponse && typeof errorResponse === 'object') {
      message = (errorResponse as any).message || message;
    }

    this.logger.error(`HTTP Exception: ${status} - ${message}`, {
      url: request.url,
      method: request.method,
    });

    const apiResponse = ApiResponse.error(
      message,
      `HTTP_${status}`,
      {
        nextStep: 'CHECK_REQUEST',
        recommendation: 'Please check your request and try again',
      }
    );

    response.status(status).json(apiResponse);
  }
}