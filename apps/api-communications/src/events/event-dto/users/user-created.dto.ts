import { IsString, IsUUID, IsOptional, IsEmail } from 'class-validator';
import { UserCreatedPayload } from '@verichron/events';

export class UserCreatedDto implements UserCreatedPayload {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  organizationId: string | null;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  invitationToken: string;

  @IsString()
  invitationExpiresAt: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsUUID()
  createdBy: string | null;
}