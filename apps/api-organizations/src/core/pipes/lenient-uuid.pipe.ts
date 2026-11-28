import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * Lenient UUID Validation Pipe
 *
 * Validates that the input matches UUID format (8-4-4-4-12 hexadecimal characters)
 * without strict version/variant bit checking. This allows test UUIDs like
 * 00000000-0000-0000-0000-000000000001 to pass validation.
 *
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * Where x is any hexadecimal digit (0-9, a-f, A-F)
 */
@Injectable()
export class LenientUUIDPipe implements PipeTransform<string, string> {
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!this.uuidRegex.test(value)) {
      throw new BadRequestException(
        `Validation failed (uuid expected, got: ${value})`,
      );
    }
    return value;
  }
}
