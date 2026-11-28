import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, PrimaryColumn, PrimaryGeneratedColumn, Index } from 'typeorm'; // Add PrimaryGeneratedColumn, Index
import { ApiProperty } from '@nestjs/swagger';
import type { UserEntity } from './user.entity';
import type { RoleEntity } from '../../rbac/entities/role.entity';

@Entity('user_memberships')
@Index(['userId', 'organizationId'], { unique: true, where: '"organization_id" IS NOT NULL' }) // Unique for org-scoped
@Index(['userId'], { unique: true, where: '"organization_id" IS NULL' }) // Unique for platform-scoped
export class UserMembershipEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) // New primary key
  id!: string;

  @ApiProperty({ description: 'The ID of the associated user.', format: 'uuid' })
  @Column({ name: 'user_id', type: 'uuid' }) // No longer primary
  userId: string;

  @ApiProperty({ description: 'The ID of the associated organization.', format: 'uuid', nullable: true })
  @Column({ name: 'organization_id', type: 'uuid', nullable: true }) // Now nullable
  organizationId: string | null; // Allow null

  @ApiProperty({ description: 'The name of the organization (denormalized for quick access).', nullable: true })
  @Column({ name: 'organization_name', type: 'varchar', length: 255, nullable: true }) // Make nullable for platform admins
  organizationName: string | null; // Allow null

  @ApiProperty({ description: 'The ID of the role the user has in this organization.', format: 'uuid' })
  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne('UserEntity', (user: UserEntity) => user.memberships)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne('RoleEntity')
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @ApiProperty({ description: 'The timestamp when the membership was created.' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'The timestamp when the membership was last updated.' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

    /**
   * Check if this is a platform membership (no organization)
   */
  isPlatformMembership(): boolean {
    return this.organizationId === null;
  }
}
