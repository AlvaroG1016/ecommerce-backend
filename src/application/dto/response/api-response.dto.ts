
export interface ApiResponseDto<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  metadata: {
    timestamp: string;
    nextStep?: string;
    recommendation?: string;
  };
}

export class ApiResponse {
  static success<T = any>(data: T, metadata?: any): ApiResponseDto<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }

  static error(message: string, code?: string, metadata?: any): ApiResponseDto<any> {
    return {
      success: false,
      error: {
        message,
        code,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }
}