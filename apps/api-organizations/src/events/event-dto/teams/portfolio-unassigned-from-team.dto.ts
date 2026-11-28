import { PortfolioUnassignedFromTeamPayload } from '@verichron/events';
import { IsUUID, IsDateString } from 'class-validator';

export class PortfolioUnassignedFromTeamDto implements PortfolioUnassignedFromTeamPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  portfolioId: string;

  @IsUUID()
  teamId: string;

  @IsDateString()
  unassignedAt: string;
}
