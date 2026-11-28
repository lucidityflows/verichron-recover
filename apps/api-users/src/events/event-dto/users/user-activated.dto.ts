
import { UserActivatedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class UserActivatedDto implements UserActivatedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  organizationId: string | null;

  @IsDateString()
  activatedAt: string;
}
