import { IsString, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { ITeamOverview, ITeamOverviewCollector } from '@verichron/contracts';

class TeamTotalsDto {
  @IsNumber()
  totalCollected: number;

  @IsNumber()
  totalContacts: number;

  @IsNumber()
  averageGoalProgress: number;

  @IsNumber()
  activeCollectors: number;
}

/**
 * Team Overview Response DTO
 * Implements ITeamOverview from @verichron/contracts
 */
export class TeamOverviewResponseDto implements ITeamOverview {
  @IsString()
  organizationId: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object) // TODO: Define specific Collector DTO if needed
  collectors: ITeamOverviewCollector[];

  @ValidateNested()
  @Type(() => TeamTotalsDto)
  teamTotals: TeamTotalsDto;

  @IsString()
  timestamp: string;
}
