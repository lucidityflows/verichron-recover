import { IsDateString, IsUUID } from 'class-validator';
import { DebtorUserLinkedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorUserLinked event
 *
 * Published when a user account is linked to a debtor identity.
 * This happens when a debtor registers as a user in the system.
 */
export class DebtorUserLinkedDto implements DebtorUserLinkedPayload {
  @IsUUID()
  debtorIdentityId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  linkedAt: string;
}
