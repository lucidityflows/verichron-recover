import { PortfolioAssignedToTeamPayload } from '@verichron/events';
import { IsUUID, IsDateString } from 'class-validator';

export class PortfolioAssignedToTeamDto implements PortfolioAssignedToTeamPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  portfolioId: string;

  @IsUUID()
  teamId: string;

  @IsDateString()
  assignedAt: string;
}
