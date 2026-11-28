// src/rbac/dto/roles/create-role.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsUUID, 
  IsString, 
  IsNotEmpty, 
  MaxLength, 
  IsOptional, 
  IsArray,
  ArrayMinSize,
  Matches 
} from 'class-validator';
import { ICreateRole } from '@verichron/contracts';

export class CreateRoleDto implements ICreateRole {
  @ApiProperty({
    description: 'The name of the role. Must be unique within the organization.',
    example: 'Collection Manager',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Role name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @ApiProperty({
    description: 'A description of the role and its responsibilities.',
    example: 'Manages a team of collectors and oversees portfolio assignments.',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    description: 'Optional array of permission IDs to assign to this role upon creation.',
    type: [String],
    example: ['perm-uuid-1', 'perm-uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}