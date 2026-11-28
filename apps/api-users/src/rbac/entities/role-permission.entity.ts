import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { PermissionEntity } from './permission.entity';
import type { RoleEntity } from './role.entity';

@Entity('role_permissions')
@Index(['roleId', 'permissionId'], { unique: true })
export class RolePermissionEntity {
  @ApiProperty({ description: 'The ID of the role.', format: 'uuid' })
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ApiProperty({ description: 'The ID of the permission.', format: 'uuid' })
  @PrimaryColumn({ name: 'permission_id', type: 'uuid' })
  permissionId: string;

  @ManyToOne('RoleEntity', (role: RoleEntity) => role.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @ManyToOne('PermissionEntity', (permission: PermissionEntity) => permission.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: PermissionEntity;
}



