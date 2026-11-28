import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Validates an event payload against its DTO class
 * NOTE: This utility is deprecated as we've moved to type-based event DTOs.
 * TypeScript provides compile-time validation, and runtime validation is handled
 * by the event publisher service.
 */
export async function validateEvent<T extends object>(
  EventClass: new () => T,
  payload: any,
): Promise<T> {
  const event = plainToClass(EventClass, payload);
  const errors = await validate(event);

  if (errors.length > 0) {
    throw new Error(
      `Event validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
    );
  }

  return event;
}