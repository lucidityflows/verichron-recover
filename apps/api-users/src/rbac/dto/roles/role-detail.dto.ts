// src/rbac/dto/roles/role-detail.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from './role-response.dto';
import { PermissionResponseDto } from '../permissions/permission-response.dto';
import { IRoleDetail } from '@verichron/contracts';

export class RoleDetailDto extends RoleResponseDto implements IRoleDetail {
  @ApiProperty({
    description: 'The permissions assigned to this role.',
    type: [PermissionResponseDto],
  })
  permissions: PermissionResponseDto[];
}