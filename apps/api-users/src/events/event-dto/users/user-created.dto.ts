
import { UserCreatedPayload } from '@verichron/events';
import { IsString, IsEmail, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class UserCreatedDto implements UserCreatedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  organizationId: string | null;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  invitationToken: string;

  @IsDateString()
  invitationExpiresAt: string;

  @IsUUID()
  roleId: string;

  @IsUUID()
  @IsOptional()
  createdBy: string | null;
}
