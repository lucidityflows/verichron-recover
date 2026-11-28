
/* IMPORTANT:
  @Index with where clause must be double-quoted or typeORM cannot automatically generate the index! 
*/

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { RolePermissionEntity } from './role-permission.entity';

@Entity('roles')
@Index(['organizationId', 'name'], { unique: true })
@Index('idx_roles_platform_name_unique', ['name'], { 
  unique: true, 
  where: '"organization_id" IS NULL' 
})
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id'})
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  //@Index()
  organizationId: string | null;

  @Column({ name: 'name', length: 100 })
  name: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'is_system_role', type: 'boolean', default: false })
  isSystemRole: boolean;

  @OneToMany('RolePermissionEntity', (rp: RolePermissionEntity) => rp.role, { cascade: true })
  rolePermissions: RolePermissionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

    /**
   * Check if this is a platform role (no organization)
   */
  isPlatformRole(): boolean {
    return this.organizationId === null && this.isSystemRole === true;
  }
}