import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { DebtorIdentityCreatedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorIdentityCreated event
 *
 * Published when a new debtor identity is created.
 * Implements DebtorIdentityCreatedPayload from @verichron/events for type safety.
 */
export class DebtorIdentityCreatedDto implements DebtorIdentityCreatedPayload {
  @IsUUID()
  identityId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsDateString()
  createdAt: string;
}
