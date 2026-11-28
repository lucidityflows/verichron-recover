import { IsUUID, IsArray, ValidateNested, IsInt, Min, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtorInvitationBatchRequestedPayload } from '@verichron/events';
import { DebtorInvitationRequestedDto } from './debtor-invitation-requested.dto';

/**
 * Event DTO for DebtorInvitationBatchRequested event
 *
 * Consumed by api-users to create provisional user accounts.
 * Implements DebtorInvitationBatchRequestedPayload from @verichron/events for type safety.
 */
export class DebtorInvitationBatchRequestedDto implements DebtorInvitationBatchRequestedPayload {
  @IsUUID()
  invitationBatchId: string;

  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsUUID()
  portfolioId?: string;

  @IsUUID()
  invitedBy: string;

  @IsInt()
  @Min(1)
  batchNumber: number;

  @IsInt()
  @Min(1)
  totalBatches: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtorInvitationRequestedDto)
  invitations: DebtorInvitationRequestedDto[];

  @IsDateString()
  invitedAt: string;
}
