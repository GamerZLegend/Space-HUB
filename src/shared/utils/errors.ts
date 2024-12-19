import { ERRORS } from '../constants';

export class BaseError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class ValidationError extends BaseError {
  constructor(message: string = ERRORS.MESSAGES.VALIDATION_ERROR, details?: any) {
    super(ERRORS.CODES.VALIDATION_ERROR, message, 400, details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = ERRORS.MESSAGES.UNAUTHORIZED, details?: any) {
    super(ERRORS.CODES.UNAUTHORIZED, message, 401, details);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = ERRORS.MESSAGES.FORBIDDEN, details?: any) {
    super(ERRORS.CODES.FORBIDDEN, message, 403, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = ERRORS.MESSAGES.NOT_FOUND, details?: any) {
    super(ERRORS.CODES.NOT_FOUND, message, 404, details);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = ERRORS.MESSAGES.RATE_LIMIT_EXCEEDED, details?: any) {
    super(ERRORS.CODES.RATE_LIMIT_EXCEEDED, message, 429, details);
  }
}

export class StreamError extends BaseError {
  constructor(message: string = ERRORS.MESSAGES.STREAM_ERROR, details?: any) {
    super(ERRORS.CODES.STREAM_ERROR, message, 500, details);
  }
}

export class PlatformError extends BaseError {
  constructor(
    platform: string,
    message: string = ERRORS.MESSAGES.PLATFORM_ERROR,
    details?: any
  ) {
    super(
      ERRORS.CODES.PLATFORM_ERROR,
      `${platform}: ${message}`,
      500,
      details
    );
  }
}

export class InternalError extends BaseError {
  constructor(message: string = ERRORS.MESSAGES.INTERNAL_ERROR, details?: any) {
    super(ERRORS.CODES.INTERNAL_ERROR, message, 500, details);
  }
}

export class ErrorHandler {
  static handle(error: any): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    // Handle platform-specific errors
    if (this.isPlatformError(error)) {
      return new PlatformError(
        error.platform,
        error.message,
        this.sanitizeErrorDetails(error)
      );
    }

    // Handle validation errors
    if (this.isValidationError(error)) {
      return new ValidationError(
        error.message,
        this.sanitizeErrorDetails(error)
      );
    }

    // Handle stream errors
    if (this.isStreamError(error)) {
      return new StreamError(
        error.message,
        this.sanitizeErrorDetails(error)
      );
    }

    // Default to internal error
    return new InternalError(
      ERRORS.MESSAGES.INTERNAL_ERROR,
      this.sanitizeErrorDetails(error)
    );
  }

  private static isPlatformError(error: any): boolean {
    return error.platform && error.code;
  }

  private static isValidationError(error: any): boolean {
    return error.validation || error.name === 'ValidationError';
  }

  private static isStreamError(error: any): boolean {
    return error.stream || error.name === 'StreamError';
  }

  private static sanitizeErrorDetails(error: any): any {
    // Remove sensitive information
    const sanitized = { ...error };
    delete sanitized.stack;
    delete sanitized.credentials;
    delete sanitized.tokens;
    delete sanitized.password;
    delete sanitized.secret;

    return sanitized;
  }

  static async handleAsync<T>(
    promise: Promise<T>,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      throw this.handle(error);
    }
  }

  static isOperational(error: Error): boolean {
    if (error instanceof BaseError) {
      return true;
    }
    return false;
  }

  static logError(error: Error, context?: any): void {
    console.error('Error occurred:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

// Error response interface
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  streamId?: string;
  platform?: string;
  action?: string;
  metadata?: Record<string, any>;
}
