import { ServiceUnavailableException } from '@nestjs/common';
import type { Logger } from '@nestjs/common';

/**
 * A reusable helper function to handle service-level errors consistently.
 * It logs the error, re-throws specific exceptions, or wraps generic errors
 * in a ServiceUnavailableException.
 *
 * @param error The caught error object (unknown type).
 * @param logger The NestJS Logger instance from the service.
 * @param contextMessage A descriptive message for the context of the operation (e.g., "Failed to get dashboard summary").
 * @param exceptionsToReThrow An optional array of exception classes that should be re-thrown directly if caught.
 */
export function handleServiceError(
  error: unknown,
  logger: Logger,
  contextMessage: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exceptionsToReThrow: (new (...args: any[]) => any)[] = [],
): never {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(`${contextMessage}: ${errorMessage}`, errorStack);

  // Check if the error is one of the specific exceptions to re-throw
  for (const ExceptionType of exceptionsToReThrow) {
    if (error instanceof ExceptionType) {
      throw error;
    }
  }

  // If not a specific exception, throw a generic ServiceUnavailableException
  throw new ServiceUnavailableException(
    `Unable to ${contextMessage.toLowerCase().replace('failed to ', '')}. Please try again later.`,
  );
}
