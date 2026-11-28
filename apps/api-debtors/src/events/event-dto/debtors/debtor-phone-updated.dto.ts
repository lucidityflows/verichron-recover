import { IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { DebtorPhoneUpdatedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorPhoneUpdated event
 *
 * Published when a debtor's phone is added, updated, or removed.
 * May trigger re-verification workflows.
 */
export class DebtorPhoneUpdatedDto implements DebtorPhoneUpdatedPayload {
  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  phoneId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  updatedAt: string;

  @IsBoolean()
  isPrimary: boolean;
}
