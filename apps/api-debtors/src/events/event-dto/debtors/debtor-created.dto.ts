import { IsDateString, IsUUID } from 'class-validator';
import { DebtorCreatedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorCreated event
 *
 * Published when a new debtor profile is created.
 * Implements DebtorCreatedPayload from @verichron/events for type safety.
 */
export class DebtorCreatedDto implements DebtorCreatedPayload {
  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  createdAt: string;
}
