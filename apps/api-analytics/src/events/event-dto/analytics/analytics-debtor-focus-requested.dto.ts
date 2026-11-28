import { AnalyticsDebtorFocusRequestedPayload } from '@verichron/events';
import { IsUUID, IsOptional } from 'class-validator';

export class AnalyticsDebtorFocusRequestedDto implements AnalyticsDebtorFocusRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;
}
