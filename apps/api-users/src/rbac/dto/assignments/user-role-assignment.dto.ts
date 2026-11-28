// src/rbac/dto/assignments/user-role-assignment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from '../roles/role-response.dto';
import { IUserRoleAssignment } from '@verichron/contracts';

export class UserRoleAssignmentDto implements IUserRoleAssignment {
  @ApiProperty({
    description: 'The user ID',
    format: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'The organization ID',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'The role assigned to the user',
    type: RoleResponseDto,
  })
  role: RoleResponseDto;

  @ApiProperty({
    description: 'When the role was assigned',
  })
  assignedAt: Date;

  @ApiProperty({
    description: 'Who assigned the role (user ID)',
    format: 'uuid',
    nullable: true,
  })
  assignedBy?: string;
}