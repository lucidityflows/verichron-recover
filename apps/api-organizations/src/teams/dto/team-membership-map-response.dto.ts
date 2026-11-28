import { ApiProperty } from '@nestjs/swagger';

export class TeamMembershipMapResponseDto {
  @ApiProperty({ description: 'Mapping of userId to team details', example: { 'user-123': { teamId: 'team-456', teamName: 'West Coast' } } })
  memberships: Record<string, { teamId: string; teamName: string }>;
}
