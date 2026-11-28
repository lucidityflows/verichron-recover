import { TeamCreatedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class TeamCreatedDto implements TeamCreatedPayload {
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
  createdAt: string;
}
