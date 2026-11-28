
// src/rbac/entities/permission.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { RolePermissionEntity } from './role-permission.entity';
import { timestamp } from 'rxjs';

@Entity('permissions')
@Index(['code'], { unique: true })
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'code', type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  description: string;

  @Column({ name: 'resource', type: 'varchar', length: 50 })
  @Index()
  resource: string;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'scope', type: 'varchar', length: 50, nullable: true })
  scope?: string;

  @OneToMany('RolePermissionEntity', (rp: RolePermissionEntity) => rp.permission)
  rolePermissions: RolePermissionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}