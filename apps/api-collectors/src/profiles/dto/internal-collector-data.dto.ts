import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, IsOptional } from 'class-validator';

/**
 * Request DTO for internal collectors data endpoints
 */
export class GetCollectorsDataDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'Array of collector user IDs',
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    type: [String],
  })
  @IsArray()
  collectorIds: string[];
}

/**
 * Response DTO for collector workload endpoint
 */
export class CollectorWorkloadResponseDto {
  @ApiProperty({
    description: 'Map of collector ID to active account count',
    example: {
      '550e8400-e29b-41d4-a716-446655440001': 15,
      '550e8400-e29b-41d4-a716-446655440002': 23,
    },
  })
  workload: Record<string, number>;
}

/**
 * Response DTO for collector skills endpoint
 */
export class CollectorSkillsResponseDto {
  @ApiProperty({
    description: 'Map of collector ID to skills array',
    example: {
      '550e8400-e29b-41d4-a716-446655440001': ['MEDICAL_DEBT', 'HIGH_BALANCE'],
      '550e8400-e29b-41d4-a716-446655440002': ['STUDENT_LOANS', 'CREDIT_CARD'],
    },
  })
  skills: Record<string, string[]>;
}

/**
 * Territory configuration for a collector
 */
export interface CollectorTerritory {
  states?: string[];
  zipcodes?: string[];
}

/**
 * Response DTO for collector territories endpoint
 */
export class CollectorTerritoriesResponseDto {
  @ApiProperty({
    description: 'Map of collector ID to territory configuration',
    example: {
      '550e8400-e29b-41d4-a716-446655440001': {
        states: ['CA', 'NV', 'AZ'],
        zipcodes: ['90001', '90002', '90003'],
      },
      '550e8400-e29b-41d4-a716-446655440002': {
        states: ['NY', 'NJ', 'CT'],
      },
    },
  })
  territories: Record<string, CollectorTerritory>;
}

/**
 * Response DTO for collector assignments endpoint
 */
export class CollectorAssignmentsResponseDto {
  @ApiProperty({
    description: 'Map of collector ID to array of active debtor IDs',
    example: {
      '550e8400-e29b-41d4-a716-446655440001': ['d1', 'd2'],
      '550e8400-e29b-41d4-a716-446655440002': ['d3'],
    },
  })
  assignments: Record<string, string[]>;
}
