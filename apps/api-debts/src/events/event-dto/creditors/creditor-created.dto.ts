import { CreditorCreatedPayload } from '@verichron/events';
import { IsString, IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreditorCreatedDto implements CreditorCreatedPayload {
  @IsUUID()
  creditorId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  legalName: string;

  @IsOptional()
  @IsString()
  ein: string | null;

  @IsString()
  normalizedName: string;

  @IsOptional()
  @IsString()
  state: string | null;

  @IsDateString()
  createdAt: string;
}
