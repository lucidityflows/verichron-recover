import { IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { DebtorEmailUpdatedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorEmailUpdated event
 *
 * Published when a debtor's email is added, updated, or removed.
 * May trigger re-verification workflows.
 */
export class DebtorEmailUpdatedDto implements DebtorEmailUpdatedPayload {
  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  emailId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  updatedAt: string;

  @IsBoolean()
  isPrimary: boolean;
}
