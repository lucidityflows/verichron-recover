import { HttpException } from '@nestjs/common';

/**
 * Base exception class for all custom business exceptions in Verichron microservices.
 *
 * All custom exceptions should extend this class to ensure a standard structure
 * with a stable error code that can be used for client-side error handling.
 *
 * @example
 * ```typescript
 * export class UserNotFoundException extends BaseException {
 *   constructor(userId: string) {
 *     super(
 *       `User with ID '${userId}' not found.`,
 *       HttpStatus.NOT_FOUND,
 *       'USERS_001'
 *     );
 *   }
 * }
 * ```
 */
export abstract class BaseException extends HttpException {
  /**
   * Creates a new BaseException
   *
   * @param response - Error message or response object
   * @param status - HTTP status code
   * @param errorCode - Unique, stable code for this error type (e.g., 'USERS_001')
   */
  constructor(
    response: string | Record<string, unknown>,
    status: number,
    public readonly errorCode: string,
  ) {
    super(response, status);
  }
}
