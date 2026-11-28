import { MembershipCreatedPayload } from '@verichron/events';
import { IsString, IsEmail, IsUUID, IsOptional } from 'class-validator';

/**
 * DTO for MembershipCreated event
 *
 * Used when an existing user is added to a new organization.
 * Unlike UserCreatedDto, this does not include invitation fields since
 * the user already exists and has credentials.
 */
export class MembershipCreatedDto implements MembershipCreatedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  organizationName: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsUUID()
  roleId: string;

  @IsUUID()
  @IsOptional()
  createdBy: string | null;
}
