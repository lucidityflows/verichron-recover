// src/rbac/dto/validation/check-permission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsArray, ArrayMinSize } from 'class-validator';

export class CheckPermissionDto {
  @ApiProperty({
    description: 'The user ID to check permissions for',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'The organization context',
    format: 'uuid',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'The permission code to check',
    example: 'debt:read',
  })
  @IsString()
  @IsNotEmpty()
  permissionCode: string;
}

export class CheckPermissionsDto {
  @ApiProperty({
    description: 'The user ID to check permissions for',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'The organization context',
    format: 'uuid',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'Array of permission codes to check',
    type: [String],
    example: ['debt:read', 'debt:update', 'payment:create'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissionCodes: string[];
}

export class PermissionCheckResultDto {
  @ApiProperty({
    description: 'The permission code that was checked',
    example: 'debt:read',
  })
  permissionCode: string;

  @ApiProperty({
    description: 'Whether the user has this permission',
    example: true,
  })
  hasPermission: boolean;
}

export class PermissionsCheckResultDto {
  @ApiProperty({
    description: 'Results for each permission check',
    type: [PermissionCheckResultDto],
  })
  results: PermissionCheckResultDto[];

  @ApiProperty({
    description: 'Whether the user has ALL requested permissions',
    example: false,
  })
  hasAllPermissions: boolean;
}