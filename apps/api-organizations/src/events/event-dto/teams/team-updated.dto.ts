import { TeamUpdatedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class TeamUpdatedDto implements TeamUpdatedPayload {
  @IsUUID()
  teamId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  name: string;

  @IsUUID()
  @IsOptional()
  managerUserId?: string;

  @IsDateString()
  updatedAt: string;
}
