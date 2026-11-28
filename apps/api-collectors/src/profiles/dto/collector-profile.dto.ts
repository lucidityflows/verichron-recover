import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  IsOptional,
  IsString,
  IsObject,
  IsEnum,
  IsBoolean,
  IsInt,
  IsPositive,
  Min,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CollectorAvailabilityStatus } from '@verichron/enums';

/**
 * DTO for availability schedule entry
 */
export class AvailabilityScheduleDto {
  @ApiProperty({
    description: 'Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '17:00',
  })
  @IsString()
  endTime: string;
}

/**
 * DTO for creating a new collector profile
 */
export class CreateCollectorProfileDto {
  @ApiProperty({
    description: 'User ID of the collector (from api-users)',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Skill tags for this collector used in skill-based assignment',
    example: ['MEDICAL_DEBT', 'HIGH_BALANCE', 'MULTILINGUAL'],
    type: [String],
    maxItems: 50,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  skills?: string[];

  @ApiPropertyOptional({
    description: 'US state codes this collector is assigned to (2-letter codes)',
    example: ['CA', 'NV', 'AZ'],
    type: [String],
    maxItems: 50,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  territoryStates?: string[];

  @ApiPropertyOptional({
    description: 'Zip codes this collector is assigned to',
    example: ['90001', '90002', '90003'],
    type: [String],
    maxItems: 100,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  territoryZipcodes?: string[];

  @ApiPropertyOptional({
    description: 'Initial availability status',
    enum: CollectorAvailabilityStatus,
    enumName: 'CollectorAvailabilityStatus',
    example: CollectorAvailabilityStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(CollectorAvailabilityStatus)
  availabilityStatus?: CollectorAvailabilityStatus;

  @ApiPropertyOptional({
    description: 'Maximum number of daily assignments',
    example: 50,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxDailyAssignments?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of concurrent accounts',
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxConcurrentAccounts?: number;

  @ApiPropertyOptional({
    description: 'Whether accepting new assignments',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isAcceptingNewAssignments?: boolean;

  @ApiPropertyOptional({
    description: 'Weekly availability schedule',
    type: [AvailabilityScheduleDto],
    example: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityScheduleDto)
  availabilitySchedule?: AvailabilityScheduleDto[];

  @ApiPropertyOptional({
    description: 'Additional metadata (e.g., languages spoken, specializations)',
    example: { specialization: 'medical', languagesSpoken: ['English', 'Spanish'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating an existing collector profile
 * All fields are optional for partial updates
 */
export class UpdateCollectorProfileDto extends PartialType(CreateCollectorProfileDto) {
  // Inherits all optional fields from CreateCollectorProfileDto
  // userId is excluded since it cannot be changed after creation
  @ApiPropertyOptional({
    description: 'Skill tags for this collector used in skill-based assignment',
    example: ['MEDICAL_DEBT', 'HIGH_BALANCE', 'MULTILINGUAL'],
    type: [String],
    maxItems: 50,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  skills?: string[];

  @ApiPropertyOptional({
    description: 'US state codes this collector is assigned to (2-letter codes)',
    example: ['CA', 'NV', 'AZ'],
    type: [String],
    maxItems: 50,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  territoryStates?: string[];

  @ApiPropertyOptional({
    description: 'Zip codes this collector is assigned to',
    example: ['90001', '90002', '90003'],
    type: [String],
    maxItems: 100,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  territoryZipcodes?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata (e.g., languages spoken, specializations)',
    example: { specialization: 'medical', languagesSpoken: ['English', 'Spanish'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Response DTO for collector profile
 */
export class CollectorProfileResponseDto {
  @ApiProperty({
    description: 'Unique collector profile identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'User ID of the collector',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'Skill tags for this collector',
    example: ['MEDICAL_DEBT', 'HIGH_BALANCE', 'MULTILINGUAL'],
    type: [String],
  })
  skills: string[];

  @ApiProperty({
    description: 'US state codes this collector is assigned to',
    example: ['CA', 'NV', 'AZ'],
    type: [String],
  })
  territoryStates: string[];

  @ApiProperty({
    description: 'Zip codes this collector is assigned to',
    example: ['90001', '90002', '90003'],
    type: [String],
  })
  territoryZipcodes: string[];

  @ApiProperty({
    description: 'Current availability status',
    enum: CollectorAvailabilityStatus,
    enumName: 'CollectorAvailabilityStatus',
    example: CollectorAvailabilityStatus.AVAILABLE,
  })
  availabilityStatus: CollectorAvailabilityStatus;

  @ApiPropertyOptional({
    description: 'Maximum number of daily assignments',
    example: 50,
  })
  maxDailyAssignments?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of concurrent accounts',
    example: 100,
  })
  maxConcurrentAccounts?: number;

  @ApiProperty({
    description: 'Whether accepting new assignments',
    example: true,
  })
  isAcceptingNewAssignments: boolean;

  @ApiPropertyOptional({
    description: 'Weekly availability schedule',
    type: [AvailabilityScheduleDto],
    example: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    ],
  })
  availabilitySchedule?: AvailabilityScheduleDto[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { specialization: 'medical', languagesSpoken: ['English', 'Spanish'] },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when profile was created',
    example: '2024-12-01T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when profile was last updated',
    example: '2024-12-05T15:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: string;
}

/**
 * Query DTO for filtering collector profiles
 */
export class CollectorProfileQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific collector user ID',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by skill tag (returns profiles with this skill)',
    example: 'MEDICAL_DEBT',
  })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({
    description: 'Filter by territory state code',
    example: 'CA',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by territory zip code',
    example: '90001',
  })
  @IsOptional()
  @IsString()
  zipcode?: string;
}

/**
 * DTO for updating collector availability status
 */
export class UpdateCollectorStatusDto {
  @ApiProperty({
    description: 'New availability status',
    enum: CollectorAvailabilityStatus,
    enumName: 'CollectorAvailabilityStatus',
    example: CollectorAvailabilityStatus.ON_BREAK,
  })
  @IsEnum(CollectorAvailabilityStatus)
  status: CollectorAvailabilityStatus;
}

/**
 * DTO for collector capacity information
 */
export class CollectorCapacityDto {
  @ApiProperty({
    description: 'Collector user ID',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'Collector name (from user service)',
    example: 'John Doe',
  })
  collectorName: string;

  @ApiProperty({
    description: 'Current availability status',
    enum: CollectorAvailabilityStatus,
    enumName: 'CollectorAvailabilityStatus',
    example: CollectorAvailabilityStatus.AVAILABLE,
  })
  availabilityStatus: CollectorAvailabilityStatus;

  @ApiProperty({
    description: 'Current number of assigned accounts',
    example: 45,
  })
  currentWorkload: number;

  @ApiPropertyOptional({
    description: 'Maximum concurrent accounts allowed',
    example: 100,
  })
  maxConcurrentAccounts?: number;

  @ApiPropertyOptional({
    description: 'Maximum daily assignments allowed',
    example: 50,
  })
  maxDailyAssignments?: number;

  @ApiProperty({
    description: 'Number of assignments today',
    example: 12,
  })
  assignmentsToday: number;

  @ApiProperty({
    description: 'Whether accepting new assignments',
    example: true,
  })
  isAcceptingNewAssignments: boolean;

  @ApiProperty({
    description: 'Workload percentage (currentWorkload / maxConcurrentAccounts * 100)',
    example: 45.0,
  })
  workloadPercentage: number;

  @ApiProperty({
    description: 'Whether collector is at or over capacity',
    example: false,
  })
  isAtCapacity: boolean;
}

/**
 * Response DTO for get capacity endpoint
 */
export class CollectorCapacityResponseDto {
  @ApiProperty({
    description: 'Array of collector capacity information',
    type: [CollectorCapacityDto],
  })
  collectors: CollectorCapacityDto[];

  @ApiProperty({
    description: 'Total number of collectors',
    example: 10,
  })
  totalCollectors: number;

  @ApiProperty({
    description: 'Number of available collectors',
    example: 7,
  })
  availableCollectors: number;

  @ApiProperty({
    description: 'Number of collectors at capacity',
    example: 2,
  })
  collectorsAtCapacity: number;
}
