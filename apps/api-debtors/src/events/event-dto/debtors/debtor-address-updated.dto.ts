import { IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { DebtorAddressUpdatedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorAddressUpdated event
 *
 * Published when a debtor's address is added, updated, or removed.
 * May trigger re-verification workflows.
 */
export class DebtorAddressUpdatedDto implements DebtorAddressUpdatedPayload {
  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  addressId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  updatedAt: string;

  @IsBoolean()
  isPrimary: boolean;
}
