// src/rbac/dto/assignments/assign-role-to-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { IAssignRoleToUser, IRemoveRoleFromUser } from '@verichron/contracts';

export class AssignRoleToUserDto implements IAssignRoleToUser {
  @ApiProperty({
    description: 'The ID of the role to assign to the user.',
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Optional note about why this role was assigned.',
    example: 'Promoted to team lead',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class RemoveRoleFromUserDto implements IRemoveRoleFromUser {
  @ApiProperty({
    description: 'The ID of the role to remove from the user.',
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Optional note about why this role was removed.',
    example: 'User transferred to different department',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}