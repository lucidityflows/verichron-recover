import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from './error-response.interface';
import { BaseException } from './base.exception';

/**
 * Extended request interface to include user context added by guards
 */
interface RequestWithContext extends Request {
  user?: {
    sub?: string;
    userId?: string;
    orgId?: string;
    organizationId?: string;
    userType?: string;
  };
  activeContext?: unknown;
}

/**
 * Global HTTP exception filter for standardized error handling across all Verichron services.
 *
 * This filter catches all exceptions (both HttpException and unexpected errors) and formats
 * them according to the ErrorResponse interface, ensuring a consistent error response
 * structure across the entire platform.
 *
 * Features:
 * - Standardized error response format
 * - Detailed error logging with stack traces
 * - Request context logging (method, URL, headers, user)
 * - Support for BaseException custom error codes
 * - Support for ValidationPipe error messages (string or array)
 *
 * @example
 * ```typescript
 * // In main.ts
 * import { GlobalHttpExceptionFilter } from '@verichron/error-handling';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *   app.useGlobalFilters(new GlobalHttpExceptionFilter());
 *   await app.listen(3000);
 * }
 * ```
 */
@Catch() // Catch all exceptions
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage: string | string[] = 'Internal server error';
    let errorCode = 'UNKNOWN_ERROR';

    // Handle BaseException (our custom exceptions)
    if (exception instanceof BaseException) {
      status = exception.getStatus();
      errorMessage = exception.message;
      errorCode = exception.errorCode;
    }
    // Handle HttpException (NestJS built-in exceptions)
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      // ValidationPipe returns { message: string | string[], error: string, statusCode: number }
      if (typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody) {
        errorMessage = (responseBody as { message: string | string[] }).message;
      } else if (typeof responseBody === 'string') {
        errorMessage = responseBody;
      } else {
        errorMessage = exception.message;
      }
    }
    // Handle generic Error instances
    else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    // Enhanced structured logging
    this.logException(exception, request, status, errorMessage, errorCode);

    // Build standardized error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: errorMessage,
      errorCode: errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Log exception with full context and stack trace
   */
  private logException(
    exception: unknown,
    request: RequestWithContext,
    status: number,
    message: string | string[],
    errorCode: string,
  ) {
    // Log summary
    const messageStr = Array.isArray(message) ? message.join(', ') : message;
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${messageStr} [${errorCode}]`
    );

    // Log full error details if it's an Error instance
    if (exception instanceof Error) {
      this.logger.error(`Error Name: ${exception.name}`);
      this.logger.error(`Error Message: ${exception.message}`);

      // Log stack trace
      if (exception.stack) {
        this.logger.error(`Stack Trace:\n${exception.stack}`);
      }

      // Log additional error properties (excluding standard Error properties)
      const errorKeys = Object.keys(exception).filter(
        key => !['stack', 'message', 'name'].includes(key)
      );

      if (errorKeys.length > 0) {
        const additionalProps = errorKeys.reduce((acc, key) => {
          acc[key] = (exception as unknown as Record<string, unknown>)[key];
          return acc;
        }, {} as Record<string, unknown>);

        this.logger.error(
          `Additional Error Properties: ${JSON.stringify(additionalProps, null, 2)}`
        );
      }
    } else {
      // If it's not an Error instance, log whatever it is
      this.logger.error(
        `Non-Error exception caught: ${JSON.stringify(exception, null, 2)}`
      );
    }

    // Log request context for debugging
    const requestContext = {
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers as Record<string, unknown>),
      user: this.extractUserContext(request),
      activeContext: request.activeContext,
    };

    this.logger.error(
      `Request Context: ${JSON.stringify(requestContext, null, 2)}`
    );
  }

  /**
   * Extract user context from request (if authenticated)
   */
  private extractUserContext(request: RequestWithContext): Record<string, unknown> | undefined {
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return {
      sub: user.sub,
      userId: user.userId,
      orgId: user.orgId,
      organizationId: user.organizationId,
      userType: user.userType,
    };
  }

  /**
   * Sanitize headers to remove sensitive data from logs
   */
  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-service-key',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

