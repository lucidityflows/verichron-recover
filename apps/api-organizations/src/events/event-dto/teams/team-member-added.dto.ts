import { TeamMemberAddedPayload } from '@verichron/events';
import { TeamMemberRole } from '@verichron/enums';
import { IsUUID, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export class TeamMemberAddedDto implements TeamMemberAddedPayload {
  @IsUUID()
  teamId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  userId: string;

  @IsEnum(TeamMemberRole)
  roleOnTeam: TeamMemberRole;

  @IsBoolean()
  isPrimary: boolean;

  @IsDateString()
  addedAt: string;
}
