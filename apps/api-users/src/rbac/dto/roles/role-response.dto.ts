// src/rbac/dto/roles/role-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IRoleResponse } from '@verichron/contracts';
import { OrganizationRole, PlatformRole } from '@verichron/enums';

export class RoleResponseDto implements IRoleResponse {
  @ApiProperty({
    description: 'The unique identifier of the role.',
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id: string;

  @ApiProperty({
    description: 'The organization this role belongs to.',
    format: 'uuid',
    example: 'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  organizationId: string | null;

  @ApiProperty({
    description: 'The name of the role.',
    oneOf: [
      { enum: Object.values(OrganizationRole) },
      { enum: Object.values(PlatformRole) },
    ],
    example: 'Collection Manager',
  })
  name: string;

  @ApiProperty({
    description: 'A description of the role and its responsibilities.',
    example: 'Manages a team of collectors and oversees portfolio assignments.',
  })
  description: string | null;

  @ApiProperty({
    description: 'Indicates if this is a system-defined role that cannot be deleted.',
    example: false,
  })
  isSystemRole: boolean;

  @ApiProperty({
    description: 'The number of users assigned to this role.',
    example: 12,
  })
  userCount: number;

  @ApiProperty({
    description: 'The timestamp when the role was created.',
    example: '2024-10-20T15:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The timestamp when the role was last updated.',
    example: '2024-10-21T10:15:00Z',
  })
  updatedAt: Date;
}

// Add these classes to the file to force Orval to generate the enums separately
// even if they are only used in oneOf above.
export class RbacEnums {
  @ApiProperty({ enum: OrganizationRole, enumName: 'OrganizationRole' })
  role!: OrganizationRole;

  @ApiProperty({ enum: PlatformRole, enumName: 'PlatformRole' })
  platformRole!: PlatformRole;
}