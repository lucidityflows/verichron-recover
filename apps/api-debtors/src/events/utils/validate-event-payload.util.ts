
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EVENT_DTO_MAP } from '../event-dto/constants';
import { EventType } from '@verichron/events';
import { Logger } from '@nestjs/common';

// A custom error for validation failures
export class EventValidationException extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Event payload validation failed');
    this.name = 'EventValidationException';
  }
}

const logger = new Logger('EventValidation');

/**
 * Validates an event payload against its corresponding DTO class.
 * @param data The raw event data payload.
 * @param eventType The type of the event, used to look up the DTO.
 * @returns The validated and transformed DTO payload.
 * @throws {EventValidationException} if validation fails.
 */
export async function validateEventPayload<T extends object>(
  data: any,
  eventType: EventType,
): Promise<T> {
  const DtoClass = (EVENT_DTO_MAP as any)[eventType];

  if (!DtoClass) {
    logger.warn(`No validation DTO found for event type: ${eventType}. Skipping validation.`);
    return data as T;
  }

  const payloadDto = plainToInstance(DtoClass, data);
  const errors = await validate(payloadDto);

  if (errors.length > 0) {
    throw new EventValidationException(errors);
  }

  return payloadDto as T;
}
