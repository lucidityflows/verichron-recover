import { IsString, IsNotEmpty, IsUUID, IsOptional, IsNumber, IsISO8601, IsArray, ValidateNested } from 'class-validator';
import type { DebtorInvitationBatchRequestedPayload } from '@verichron/events';
import { DebtorInvitationRequestedDto } from './debtor-invitation-requested.dto';
import { Type } from 'class-transformer';

export class DebtorInvitationBatchRequestedDto implements DebtorInvitationBatchRequestedPayload {

  @IsString()
  @IsNotEmpty()
  invitationBatchId: string;

  @IsUUID()
  @IsOptional()
  portfolioId?: string | undefined;

  @IsUUID()
  @IsNotEmpty()
  invitedBy: string;

  @IsString()
  @IsNotEmpty()
  batchNumber: number;

  @IsNumber()
  @IsNotEmpty()
  totalBatches: number;

  @IsISO8601()
  @IsNotEmpty()
  invitedAt: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  batchId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtorInvitationRequestedDto)
  invitations: DebtorInvitationRequestedDto[];
}
