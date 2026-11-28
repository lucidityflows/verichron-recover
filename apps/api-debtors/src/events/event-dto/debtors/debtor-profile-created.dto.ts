import { IsDateString, IsUUID } from 'class-validator';
import { DebtorProfileCreatedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorProfileCreated event
 *
 * Published when a new debtor profile is created.
 * Implements DebtorProfileCreatedPayload from @verichron/events for type safety.
 */
export class DebtorProfileCreatedDto implements DebtorProfileCreatedPayload {
  @IsUUID()
  profileId: string;

  @IsUUID()
  identityId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  createdAt: string;
}
