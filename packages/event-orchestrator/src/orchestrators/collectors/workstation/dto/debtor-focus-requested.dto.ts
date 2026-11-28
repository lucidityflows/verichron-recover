import { IsString, IsUUID, IsOptional } from 'class-validator';

/**
 * Analytics Debtor Focus Requested Event Payload
 *
 * Published by api-organizations when a collector requests debtor focus view.
 * Triggers event orchestrator to fetch debtor details from all services.
 */
export class AnalyticsDebtorFocusRequestedDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
