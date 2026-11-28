import { IsNumber, IsOptional } from 'class-validator';
import type { CollectorStats } from '@verichron/events';

/**
 * Collector Stats Response DTO
 * Implements CollectorStats from @verichron/events
 */
export class CollectorStatsResponseDto implements CollectorStats {
  @IsNumber()
  callsMade: number;

  @IsNumber()
  emailsSent: number;

  @IsNumber()
  smsSent: number;

  @IsNumber()
  accountsContacted: number;

  @IsNumber()
  emailResponseRate: number;

  @IsNumber()
  collectedToday: number;

  @IsNumber()
  totalCollected: number;

  @IsNumber()
  successfulPayments: number;

  @IsNumber()
  paymentPlansCreated: number;

  @IsNumber()
  uniquePayingAccounts: number;

  @IsNumber()
  totalActions: number;

  @IsNumber()
  notesAdded: number;

  @IsNumber()
  @IsOptional()
  callsTrend?: number;
}
