import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import type { IDebtorFocusView } from '@verichron/contracts';

/**
 * Analytics Debtor Focus Completed Event Payload
 *
 * Published by event orchestrator after aggregating debtor details from all services.
 * Contains complete 360-degree view of the debtor.
 */
export class AnalyticsDebtorFocusCompletedDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsObject()
  @IsOptional()
  debtorFocusView?: IDebtorFocusView;

  @IsString()
  @IsOptional()
  error?: string;
}
