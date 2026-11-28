import { IsEnum, IsString, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import type { CollectorLeaderboard, LeaderboardEntry } from '@verichron/events';
import { TrendGranularity } from '@verichron/enums';

class LeaderboardEntryDto implements LeaderboardEntry {
  @IsString()
  collectorId: string;

  @IsString()
  collectorName: string;

  @IsNumber()
  totalCollected: number;

  @IsNumber()
  rank: number;

  @IsBoolean()
  isCurrentUser: boolean;

  @IsNumber()
  accountsResolved: number;

  @IsNumber()
  totalContacts: number;
}

/**
 * Collector Leaderboard Response DTO
 * Implements CollectorLeaderboard from @verichron/events
 */
export class CollectorLeaderboardResponseDto implements CollectorLeaderboard {
  @IsEnum(TrendGranularity)
  period: TrendGranularity;

  @IsString()
  periodStart: string;

  @IsString()
  periodEnd: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaderboardEntryDto)
  entries: LeaderboardEntryDto[];

  @IsNumber()
  totalCollectors: number;

  @IsNumber()
  currentUserRank: number;
}
