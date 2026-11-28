// src/rbac/dto/roles/update-role.dto.ts
import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { CreateRoleDto } from './create-role.dto';
import { IUpdateRole } from '@verichron/contracts';

// Omit permissionIds - use separate endpoint for permission management
export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['permissionIds'] as const)
) implements IUpdateRole {
  @ApiPropertyOptional({
    description: 'The name of the role. Must be unique within the organization.',
    example: 'Senior Collection Manager',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Role name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'A description of the role and its responsibilities.',
    example: 'Manages multiple teams of collectors and strategic portfolio decisions.',
    minLength: 1,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}