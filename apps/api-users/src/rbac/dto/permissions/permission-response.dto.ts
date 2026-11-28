// src/rbac/dto/permissions/permission-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IPermissionResponse } from '@verichron/contracts';
import { OrganizationPermission, PlatformPermission } from '@verichron/enums';

export class PermissionResponseDto implements IPermissionResponse {
  @ApiProperty({
    description: 'The unique identifier of the permission.',
    format: 'uuid',
    example: 'c2aabbcc-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  id: string;

  @ApiProperty({
    description: 'The permission code in resource:action format.',
    oneOf: [
      { enum: Object.values(OrganizationPermission) },
      { enum: Object.values(PlatformPermission) },
    ],
    example: 'debt:read',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable description of what this permission allows.',
    example: 'View debt details and account information',
  })
  description: string;

  @ApiProperty({
    description: 'The resource this permission applies to.',
    example: 'debt',
  })
  resource: string;

  @ApiProperty({
    description: 'The action this permission allows on the resource.',
    example: 'read',
  })
  action: string;

  @ApiProperty({
    description: 'Optional scope modifier for fine-grained permissions.',
    example: 'own',
    nullable: true,
  })
  scope?: string;

  @ApiProperty({
    description: 'The timestamp when the permission was created.',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;
}

export class PermissionEnums {
  @ApiProperty({ enum: OrganizationPermission, enumName: 'OrganizationPermission' })
  orgPermission!: OrganizationPermission;

  @ApiProperty({ enum: PlatformPermission, enumName: 'PlatformPermission' })
  platformPermission!: PlatformPermission;
}