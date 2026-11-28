import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class EventPublishingFailedException extends BaseException {
  constructor(eventName: string, reason: string) {
    super(
      `Failed to publish event '${eventName}': ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ORGS_ONBOARDING_005',
    );
  }
}
