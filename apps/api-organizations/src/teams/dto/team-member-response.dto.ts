import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamMemberRole } from '@verichron/enums';

export class TeamMemberResponseDto {
  @ApiProperty({ description: 'ID of the team', format: 'uuid' })
  teamId!: string;

  @ApiProperty({ description: 'User ID of the team member', format: 'uuid' })
  userId!: string;

  @ApiProperty({ description: 'Whether this is the user\'s primary team', example: true })
  isPrimary!: boolean;

  @ApiProperty({ description: 'Role of the member within this team', enum: TeamMemberRole, enumName: 'TeamMemberRole', example: TeamMemberRole.MEMBER })
  roleOnTeam!: TeamMemberRole;

  @ApiProperty({ description: 'Timestamp when the user joined the team', format: 'date-time' })
  joinedAt!: string;
}
