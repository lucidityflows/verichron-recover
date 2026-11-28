import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectorAvailabilityStatus } from '@verichron/enums';

export class CollectorFloorStatusDto {
  @ApiProperty({ description: 'User ID of the collector' })
  id: string;

  @ApiProperty({ description: 'Full name of the collector' })
  name: string;

  @ApiProperty({ 
    description: 'Current status',
    enum: ['ACTIVE', 'IDLE', 'BREAK', 'OFFLINE']
  })
  status: 'ACTIVE' | 'IDLE' | 'BREAK' | 'OFFLINE';

  @ApiPropertyOptional({ description: 'Name of the debtor currently being worked' })
  currentDebtorName?: string;

  @ApiProperty({ description: 'Total amount collected today (in cents)' })
  todayCollected: number;

  @ApiProperty({ description: 'Daily collection goal (in cents)' })
  todayGoal: number;

  @ApiProperty({ description: 'Number of calls made today' })
  callsToday: number;

  @ApiPropertyOptional({ description: 'Timestamp of last recorded activity' })
  lastActivity?: string;
}

export class TeamStatsDto {
  @ApiProperty({ description: 'Total amount collected by the team today' })
  totalCollected: number;

  @ApiProperty({ description: 'Total calls made by the team today' })
  totalCalls: number;

  @ApiProperty({ description: 'Average progress toward daily goals (0-100)' })
  avgGoalProgress: number;
}

export class FloorStatusResponseDto {
  @ApiProperty({ type: [CollectorFloorStatusDto] })
  collectors: CollectorFloorStatusDto[];

  @ApiProperty({ type: TeamStatsDto })
  teamStats: TeamStatsDto;
}
