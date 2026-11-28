import { ApiProperty } from '@nestjs/swagger';
import { TeamResponseDto } from './team-response.dto';

export class PortfolioTeamAssignmentResponseDto {
  @ApiProperty({ description: 'Assignment UUID', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Organization UUID', format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ description: 'Portfolio UUID (from api-debts)', format: 'uuid' })
  portfolioId!: string;

  @ApiProperty({ description: 'Team UUID', format: 'uuid' })
  teamId!: string;

  @ApiProperty({ description: 'Team details', type: () => TeamResponseDto, required: false })
  team?: TeamResponseDto;

  @ApiProperty({ description: 'Assignment timestamp', format: 'date-time' })
  assignedAt!: string;
}
