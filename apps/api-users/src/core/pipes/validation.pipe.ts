/**
 * @file ValidationPipe
 * @description Global validation pipe for NestJS applications.
 *   This pipe automatically validates incoming request DTOs (Data Transfer Objects)
 *   using `class-validator` and transforms plain JavaScript objects into class instances
 *   using `class-transformer`.
 *
 * @overview
 *   - **Automatic Validation**: Ensures all incoming data (from request body, query, params)
 *     conforms to the validation rules defined in the DTOs.
 *   - **Type Transformation**: Converts plain objects received over the network into
 *     instances of the DTO classes, enabling method-based validation and type safety.
 *   - **Whitelist & Forbid Non-Whitelisted**: By default, it removes any properties from the
 *     request payload that are not defined in the DTO (`whitelist: true`). It also throws
 *     an error if unknown properties are present (`forbidNonWhitelisted: true`), preventing
 *     unexpected data from reaching the application logic.
 *   - **Error Handling**: Collects all validation errors and throws a `BadRequestException`
 *     with a formatted message, providing clear feedback to the client.
 *
 * @usage
 *   This pipe should be registered globally in `main.ts` or `app.module.ts` to apply
 *   validation across the entire application.
 *
 * @example
 * // In main.ts (or app.module.ts providers array):
 * // app.useGlobalPipes(new ValidationPipe());
 */
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const messages = this.flattenValidationErrors(errors);
      throw new BadRequestException(messages.join(', '));
    }
    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private flattenValidationErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];

    for (const err of errors) {
      if (err.constraints) {
        messages.push(...Object.values(err.constraints));
      }

      if (Array.isArray(err.children) && err.children.length > 0) {
        const childMessages = this.flattenValidationErrors(err.children);
        if (childMessages.length > 0) {
          messages.push(...childMessages);
        }
      }
    }

    return messages;
  }
}
