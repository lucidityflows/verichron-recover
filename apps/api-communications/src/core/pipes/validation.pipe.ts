import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';
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

  private flattenValidationErrors(errors: any[]): string[] {
    const messages: string[] = [];
  
    for (const err of errors) {
      if (err.constraints) {
        messages.push(...Object.values(err.constraints as Record<string, string>));
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
