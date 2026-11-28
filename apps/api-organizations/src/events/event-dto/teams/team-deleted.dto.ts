import { TeamDeletedPayload } from '@verichron/events';
import { IsUUID, IsDateString } from 'class-validator';

export class TeamDeletedDto implements TeamDeletedPayload {
  @IsUUID()
  teamId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  deletedAt: string;
}
