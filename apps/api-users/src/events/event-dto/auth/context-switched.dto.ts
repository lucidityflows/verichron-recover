
import { ContextSwitchedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsIP } from 'class-validator';

export class ContextSwitchedDto implements ContextSwitchedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  fromOrganizationId: string;

  @IsUUID()
  @IsOptional()
  toOrganizationId: string | null;

  @IsIP()
  @IsOptional()
  ipAddress?: string;
}
