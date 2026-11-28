import { ApiProperty } from '@nestjs/swagger';
import { CollectorTodayStatsDto, CollectorWeekStatsDto, CollectorLeaderboardDto } from './collector-stats.dto';

/**
 * Collector Dashboard Summary
 *
 * Consolidated response containing all metrics needed for the collector dashboard.
 * Optimized to provide today's stats, week's stats, and leaderboard in a single request.
 */
export class CollectorDashboardSummaryDto {
  @ApiProperty({
    description: "Today's collector performance statistics",
    type: CollectorTodayStatsDto,
  })
  todayStats!: CollectorTodayStatsDto;

  @ApiProperty({
    description: "This week's collector performance statistics",
    type: CollectorWeekStatsDto,
  })
  weekStats!: CollectorWeekStatsDto;

  @ApiProperty({
    description: 'Team leaderboard for current month',
    type: CollectorLeaderboardDto,
  })
  leaderboard!: CollectorLeaderboardDto;
}
