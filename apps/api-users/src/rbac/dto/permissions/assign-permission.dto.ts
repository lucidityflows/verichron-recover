// src/rbac/dto/permissions/assign-permission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { 
  IAssignPermissionToRole, 
  IAssignPermissionsToRole, 
  IRemovePermissionFromRole 
} from '@verichron/contracts';

export class AssignPermissionToRoleDto implements IAssignPermissionToRole {
  @ApiProperty({
    description: 'The ID of the permission to assign to the role.',
    format: 'uuid',
    example: 'c2aabbcc-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID()
  permissionId: string;
}

export class AssignPermissionsToRoleDto implements IAssignPermissionsToRole {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the role.',
    type: [String],
    example: ['perm-uuid-1', 'perm-uuid-2', 'perm-uuid-3'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class RemovePermissionFromRoleDto implements IRemovePermissionFromRole {
  @ApiProperty({
    description: 'The ID of the permission to remove from the role.',
    format: 'uuid',
    example: 'c2aabbcc-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID()
  permissionId: string;
}