import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ITeamOverview, ITeamOverviewCollector } from '@verichron/contracts';
import { CollectorAvailabilityStatus } from '@verichron/enums';

export class TeamOverviewWorkloadDto {
  @ApiProperty()
  active!: number;

  @ApiProperty()
  capacity!: number;

  @ApiProperty()
  percentage!: number;
}

export class TeamOverviewPerformanceDto {
  @ApiProperty()
  todayCollected!: number;

  @ApiProperty()
  todayContacts!: number;

  @ApiProperty()
  goalProgress!: number;
}

export class TeamOverviewTotalsDto {
  @ApiProperty()
  totalCollected!: number;

  @ApiProperty()
  totalContacts!: number;

  @ApiProperty()
  averageGoalProgress!: number;

  @ApiProperty()
  activeCollectors!: number;
}

export class CollectorPortfolioDistributionDto {
  @ApiProperty()
  portfolioId!: string;

  @ApiProperty()
  portfolioName!: string;

  @ApiProperty()
  accountCount!: number;

  @ApiProperty()
  totalBalance!: number;
}

export class TeamOverviewCollectorDto implements ITeamOverviewCollector {
  @ApiProperty({ description: 'User ID of the collector' })
  userId!: string;

  @ApiProperty({ description: 'Full name of the collector' })
  fullName!: string;

  @ApiProperty({ description: 'Email address' })
  email!: string;

  @ApiProperty({ enum: CollectorAvailabilityStatus, enumName: 'CollectorAvailabilityStatus' })
  status!: CollectorAvailabilityStatus;

  @ApiProperty({ description: 'ISO timestamp of last known activity' })
  lastActivity!: string;

  @ApiProperty({ type: TeamOverviewWorkloadDto })
  workload!: TeamOverviewWorkloadDto;

  @ApiProperty({ type: TeamOverviewPerformanceDto })
  performance!: TeamOverviewPerformanceDto;

  @ApiProperty({ type: [CollectorPortfolioDistributionDto] })
  portfolios!: CollectorPortfolioDistributionDto[];
}

export class TeamOverviewResponseDto implements ITeamOverview {
  @ApiProperty()
  organizationId!: string;

  @ApiPropertyOptional()
  teamId?: string;

  @ApiProperty({ type: [TeamOverviewCollectorDto] })
  collectors!: TeamOverviewCollectorDto[];

  @ApiProperty({ type: TeamOverviewTotalsDto })
  teamTotals!: TeamOverviewTotalsDto;

  @ApiProperty()
  timestamp!: string;
}
