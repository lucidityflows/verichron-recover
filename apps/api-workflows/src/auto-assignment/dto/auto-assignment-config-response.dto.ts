import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutoAssignmentStrategy } from '@verichron/enums';
import { AutoAssignmentConfig, type AutoAssignmentFilters } from '../entities/auto-assignment-config.entity';

// Helper DTO for AutoAssignmentFilters (if needed for OpenAPI spec to be more precise)
class AutoAssignmentFiltersResponseDto implements AutoAssignmentFilters {
  @ApiPropertyOptional({
    description: 'List of portfolio IDs to filter by',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
  })
  portfolioIds?: string[];

  @ApiPropertyOptional({
    description: 'Balance range [min, max] to filter by',
    type: [Number],
    minItems: 2,
    maxItems: 2,
    example: [1000, 5000],
  })
  balanceRange?: [number, number];

  @ApiPropertyOptional({
    description: 'Account age range [min, max] in days to filter by',
    type: [Number],
    minItems: 2,
    maxItems: 2,
    example: [30, 90],
  })
  accountAgeRange?: [number, number];

  @ApiPropertyOptional({
    description: 'List of priorities to filter by',
    type: [String],
    example: ['HIGH', 'MEDIUM'],
  })
  priority?: string[];

  // Allow other custom properties
  [key: string]: any;
}

export class AutoAssignmentConfigResponseDto {
  @ApiProperty({
    description: 'Unique ID of the auto-assignment configuration',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the organization this configuration belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Name of the auto-assignment configuration',
    example: 'Round Robin for New Accounts',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the auto-assignment configuration',
    example: 'Assigns new accounts created today to collectors using a round-robin strategy.',
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the configuration is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Strategy for assigning accounts',
    enum: AutoAssignmentStrategy,
    example: AutoAssignmentStrategy.ROUND_ROBIN,
  })
  strategy: AutoAssignmentStrategy;

  @ApiProperty({
    description: 'Filters to determine which accounts are eligible for this assignment configuration',
    type: AutoAssignmentFiltersResponseDto,
  })
  filters: AutoAssignmentFilters;

  @ApiProperty({
    description: 'List of collector IDs eligible for assignment under this configuration',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
  })
  collectorPool: string[];

  @ApiPropertyOptional({
    description: 'List of collector IDs to exclude from assignment',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
  })
  excludeCollectors?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of assignments per collector per day',
    example: 50,
  })
  maxAssignmentsPerDay?: number;

  @ApiPropertyOptional({
    description: 'Maximum workload (e.g., number of active accounts) a collector can have before being excluded from assignment',
    example: 200,
  })
  workloadThreshold?: number;

  @ApiPropertyOptional({
    description: 'ID of the user who created the configuration',
    example: 'c1d2e3f4-a5b6-7890-1234-567890abcdef',
  })
  createdBy?: string;

  @ApiProperty({
    description: 'Date when the configuration was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the configuration was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Optional delay in minutes before executing the assignment (for "wait and see" strategies)',
    example: 1440,
  })
  delayMinutes?: number;

  @ApiProperty({
    description: 'Number of consecutive failures before auto-disable',
    example: 0,
    default: 0,
  })
  consecutiveFailures: number;

  @ApiProperty({
    description: 'Whether the config was automatically disabled due to repeated failures',
    example: false,
    default: false,
  })
  autoDisabled: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when the config was automatically disabled',
    example: '2023-10-27T10:00:00.000Z',
  })
  autoDisabledAt?: Date;

  @ApiPropertyOptional({
    description: 'Reason for auto-disable (includes last error message)',
    example: 'Automatically disabled after 5 consecutive failures. Last error: Collector not found',
  })
  autoDisabledReason?: string;

  constructor(config: AutoAssignmentConfig) {
    this.id = config.id;
    this.organizationId = config.organizationId;
    this.name = config.name;
    this.description = config.description;
    this.enabled = config.enabled;
    this.strategy = config.strategy;
    this.filters = config.filters;
    this.collectorPool = config.collectorPool;
    this.excludeCollectors = config.excludeCollectors;
    this.maxAssignmentsPerDay = config.maxAssignmentsPerDay;
    this.workloadThreshold = config.workloadThreshold;
    this.createdBy = config.createdBy;
    this.createdAt = config.createdAt;
    this.updatedAt = config.updatedAt;
    this.delayMinutes = config.delayMinutes;
    this.consecutiveFailures = config.consecutiveFailures;
    this.autoDisabled = config.autoDisabled;
    this.autoDisabledAt = config.autoDisabledAt;
    this.autoDisabledReason = config.autoDisabledReason;
  }
}
