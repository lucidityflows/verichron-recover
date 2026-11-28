import { IsArray, IsDateString, IsString, IsUUID } from 'class-validator';
import { DebtorUpdatedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorUpdated event
 *
 * Published when a debtor profile is modified.
 * Implements DebtorUpdatedPayload from @verichron/events for type safety.
 */
export class DebtorUpdatedDto implements DebtorUpdatedPayload {
  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  updatedAt: string;

  @IsArray()
  @IsString({ each: true })
  updatedFields: string[];
}
