import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectorAvailabilityStatus } from '@verichron/enums';

/**
 * Collector Profile Entity
 *
 * Stores collector-specific metadata including skills and territory assignments.
 * This entity complements the User entity from api-users by storing
 * collection-specific attributes.
 *
 * Key Design Principles:
 * - One profile per collector (user) per organization
 * - Skills used for skill-based auto-assignment matching
 * - Territories used for geographic auto-assignment matching
 * - Updated by managers/admins through collector management UI
 *
 * Authorization:
 * - Users must have COLLECTOR_PROFILES:WRITE permission to modify
 * - Collectors can view their own profile (read-only)
 * - Managers can view and edit all profiles in their organization
 */
@Entity({ name: 'collector_profiles' })
@Index(['organizationId', 'userId'])
@Unique(['organizationId', 'userId']) // One profile per user per organization
export class CollectorProfile {
  @ApiProperty({
    description: 'Unique collector profile identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this collector profile',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'User ID of the collector (from api-users)',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ApiPropertyOptional({
    description: 'Skill tags for this collector used in skill-based assignment',
    example: ['MEDICAL_DEBT', 'HIGH_BALANCE', 'MULTILINGUAL'],
    type: [String],
  })
  @Column({ name: 'skills', type: 'text', array: true, default: [] })
  skills: string[];

  @ApiPropertyOptional({
    description: 'US state codes this collector is assigned to',
    example: ['CA', 'NV', 'AZ'],
    type: [String],
  })
  @Column({ name: 'territory_states', type: 'text', array: true, default: [] })
  territoryStates: string[];

  @ApiPropertyOptional({
    description: 'Zip codes this collector is assigned to',
    example: ['90001', '90002', '90003'],
    type: [String],
  })
  @Column({ name: 'territory_zipcodes', type: 'text', array: true, default: [] })
  territoryZipcodes: string[];

  @ApiProperty({
    description: 'Current availability status of the collector',
    enum: CollectorAvailabilityStatus,
    enumName: 'CollectorAvailabilityStatus',
    example: CollectorAvailabilityStatus.AVAILABLE,
  })
  @Column({
    name: 'availability_status',
    type: 'varchar',
    length: 20,
    default: CollectorAvailabilityStatus.AVAILABLE,
  })
  availabilityStatus: CollectorAvailabilityStatus;

  @ApiPropertyOptional({
    description: 'Maximum number of daily assignments this collector can handle',
    example: 50,
  })
  @Column({ name: 'max_daily_assignments', type: 'integer', nullable: true })
  maxDailyAssignments: number | null;

  @ApiPropertyOptional({
    description: 'Maximum number of concurrent accounts this collector can manage',
    example: 100,
  })
  @Column({ name: 'max_concurrent_accounts', type: 'integer', nullable: true })
  maxConcurrentAccounts: number | null;

  @ApiProperty({
    description: 'Whether this collector is currently accepting new assignments',
    example: true,
  })
  @Column({ name: 'is_accepting_new_assignments', type: 'boolean', default: true })
  isAcceptingNewAssignments: boolean;

  @ApiPropertyOptional({
    description: 'Weekly availability schedule for time-based routing',
    example: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    ],
    type: 'array',
  })
  @Column({ name: 'availability_schedule', type: 'jsonb', nullable: true })
  availabilitySchedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> | null;

  @ApiPropertyOptional({
    description: 'Additional metadata for future use',
    example: { specialization: 'medical', languagesSpoken: ['English', 'Spanish'] },
  })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Timestamp when this profile was created',
    example: '2024-12-01T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when this profile was last updated',
    example: '2024-12-05T15:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
