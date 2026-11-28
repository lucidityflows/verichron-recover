import { ApiProperty } from "@nestjs/swagger";
import { RoleResponseDto } from "../../../rbac/dto";
import { UserStatus } from "@verichron/enums";
import type { UserRole } from "@verichron/enums";
import { EmailResponseDto } from "../emails/email-response.dto";
import { PhoneNumberResponseDto } from "../phones/phone-number-response.dto";
import { AddressResponseDto } from "../addresses/address-response.dto";
import { 
  IUserMembership, 
  IUserResponse, 
  IUserSummary, 
  IUserDetail 
} from "@verichron/contracts";

export class UserMembershipDto implements IUserMembership {
  @ApiProperty({ 
    description: 'The organization ID', 
    format: 'uuid',
    nullable: true,
  })
  organizationId: string | null;

  @ApiProperty({ 
    description: 'The organization name', 
    example: 'Acme Collections',
    nullable: true,
  })
  organizationName: string | null;

  @ApiProperty({ 
    description: 'The user\'s role within this organization',
    type: () => RoleResponseDto
  })
  role: RoleResponseDto;

  @ApiProperty({ 
    description: 'When the user joined this organization' 
  })
  joinedAt: Date;
}

export class UserResponseDto implements IUserResponse {
  @ApiProperty({
    description: 'The unique identifier of the user.',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'The first name of the user.',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'The last name of the user.',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'The primary email address of the user.',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The current status of the user account.',
    enum: UserStatus,
    enumName: 'UserStatus',
  })
  status: UserStatus;

  @ApiProperty({
    description: 'The organizations this user belongs to and their roles.',
    type: [UserMembershipDto],
  })
  memberships: UserMembershipDto[];

  @ApiProperty({
    description: 'The timestamp when the user was created.',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The timestamp when the user was last updated.',
  })
  updatedAt: Date;
}

// Basic user info (for lists, summaries)
export class UserSummaryDto implements IUserSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status: UserStatus;

  @ApiProperty({ 
    description: 'Primary role of the user in the current context',
    example: 'ORG_ADMIN',
    required: false
  })
  roleName?: UserRole;
}

// Full user profile (for GET /users/:id)
export class UserDetailDto extends UserSummaryDto implements IUserDetail {
  @ApiProperty({
    description: 'The organizations this user belongs to and their roles.',
    type: [UserMembershipDto],
  })
  memberships: UserMembershipDto[];

  @ApiProperty({
    description: 'Additional email addresses',
    type: [EmailResponseDto],
  })
  emails: EmailResponseDto[];

  @ApiProperty({
    description: 'Phone numbers',
    type: [PhoneNumberResponseDto],
  })
  phoneNumbers: PhoneNumberResponseDto[];

  @ApiProperty({
    description: 'Addresses',
    type: [AddressResponseDto],
  })
  addresses: AddressResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
