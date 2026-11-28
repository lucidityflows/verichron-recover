import { TeamMemberRemovedPayload } from '@verichron/events';
import { IsUUID, IsDateString } from 'class-validator';

export class TeamMemberRemovedDto implements TeamMemberRemovedPayload {
  @IsUUID()
  teamId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  userId: string;

  @IsDateString()
  removedAt: string;
}
