import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsUUID,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AutoAssignmentStrategy } from '@verichron/enums';
import { AutoAssignmentFilters } from '../entities/auto-assignment-config.entity'; // Using the interface from entity for now

// Helper DTO for filters (if needed for OpenAPI spec to be more precise)
class AutoAssignmentFiltersDto implements AutoAssignmentFilters {
  @ApiPropertyOptional({
    description: 'List of portfolio IDs to filter by',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  portfolioIds?: string[];

  @ApiPropertyOptional({
    description: 'Balance range [min, max] to filter by',
    type: [Number],
    minItems: 2,
    maxItems: 2,
    example: [1000, 5000],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  balanceRange?: [number, number];

  @ApiPropertyOptional({
    description: 'Account age range [min, max] in days to filter by',
    type: [Number],
    minItems: 2,
    maxItems: 2,
    example: [30, 90],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  accountAgeRange?: [number, number];

  @ApiPropertyOptional({
    description: 'List of priorities to filter by',
    type: [String],
    example: ['HIGH', 'MEDIUM'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priority?: string[];

  // Allow other custom properties
  [key: string]: any;
}


export class CreateAutoAssignmentDto {
  @ApiProperty({
    description: 'Name of the auto-assignment configuration',
    example: 'Round Robin for New Accounts',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the auto-assignment configuration',
    example: 'Assigns new accounts created today to collectors using a round-robin strategy.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the configuration is enabled',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Strategy for assigning accounts',
    enum: AutoAssignmentStrategy,
    example: AutoAssignmentStrategy.ROUND_ROBIN,
  })
  @IsEnum(AutoAssignmentStrategy)
  strategy: AutoAssignmentStrategy;

  @ApiProperty({
    description: 'Filters to determine which accounts are eligible for this assignment configuration',
    type: AutoAssignmentFiltersDto,
  })
  @ValidateNested()
  @Type(() => AutoAssignmentFiltersDto)
  filters: AutoAssignmentFiltersDto;

  @ApiProperty({
    description: 'List of collector IDs eligible for assignment under this configuration',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  collectorPool: string[];

  @ApiPropertyOptional({
    description: 'List of collector IDs to exclude from assignment',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludeCollectors?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of assignments per collector per day',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAssignmentsPerDay?: number;

  @ApiPropertyOptional({
    description: 'Maximum workload (e.g., number of active accounts) a collector can have before being excluded from assignment',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workloadThreshold?: number;

  @ApiPropertyOptional({
    description: 'Optional delay in minutes before executing the assignment (for "wait and see" strategies)',
    example: 1440,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delayMinutes?: number;
}
