import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Creditor } from '../entities/creditor.entity';

/**
 * DTO for creditor API responses.
 *
 * Maps from Creditor entity to client-friendly response format.
 * Used by:
 * - GET /creditors (list)
 * - GET /creditors/:id (detail)
 * - POST /creditors (create)
 * - PATCH /creditors/:id (update)
 *
 * Notes:
 * - Includes global linking metadata for UI badges
 * - Includes hygiene score for data quality indicators
 * - Can be extended with computed fields (e.g., debtCount)
 */
export class CreditorResponseDto {
  @ApiProperty({
    description: 'Unique creditor identifier',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this creditor',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Legal name of the creditor',
    example: 'JPMorgan Chase N.A.',
  })
  legalName: string;

  @ApiProperty({
    description: 'Normalized name for fuzzy matching',
    example: 'JPMORGAN CHASE',
  })
  normalizedName: string;

  @ApiPropertyOptional({
    description: 'Employer Identification Number (EIN)',
    example: '13-2890427',
    nullable: true,
  })
  ein: string | null;

  @ApiPropertyOptional({
    description: 'Doing Business As (DBA) name',
    example: 'Chase Bank',
    nullable: true,
  })
  dbaName: string | null;

  @ApiPropertyOptional({
    description: 'Primary street address',
    example: '270 Park Avenue',
    nullable: true,
  })
  street1: string | null;

  @ApiPropertyOptional({
    description: 'Street address line 2',
    nullable: true,
  })
  street2: string | null;

  @ApiPropertyOptional({
    description: 'Street address line 3',
    nullable: true,
  })
  street3: string | null;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
    nullable: true,
  })
  city: string | null;

  @ApiPropertyOptional({
    description: 'State (2-letter code)',
    example: 'NY',
    nullable: true,
  })
  state: string | null;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '10017',
    nullable: true,
  })
  postalCode: string | null;

  @ApiProperty({
    description: 'Country (ISO 3166-1 alpha-2 code)',
    example: 'US',
  })
  country: string;

  @ApiPropertyOptional({
    description: 'Latitude for geocoding',
    example: 40.7549,
    nullable: true,
  })
  latitude: number | null;

  @ApiPropertyOptional({
    description: 'Longitude for geocoding',
    example: -73.9840,
    nullable: true,
  })
  longitude: number | null;

  @ApiProperty({
    description: 'Whether this is the master record',
    example: true,
  })
  isMasterRecord: boolean;

  @ApiPropertyOptional({
    description: 'Reference to master creditor if this is a duplicate',
    example: 'a47ac10b-58cc-4372-a567-0e02b2c3d480',
    nullable: true,
  })
  masterCreditorId: string | null;

  @ApiPropertyOptional({
    description: 'Match confidence score from entity resolution',
    example: 97.5,
    nullable: true,
  })
  matchConfidenceScore: number | null;

  @ApiProperty({
    description: 'Whether EIN was verified via lookup API',
    example: true,
  })
  einVerified: boolean;

  @ApiPropertyOptional({
    description: 'Reference to platform-owned global creditor',
    example: 'c1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6',
    nullable: true,
  })
  globalCreditorId: string | null;

  @ApiProperty({
    description: 'Whether linked to platform-verified global creditor (Gold List)',
    example: true,
  })
  isPlatformVerified: boolean;

  @ApiPropertyOptional({
    description: 'Confidence score of global creditor match (0-100)',
    example: 98.0,
    nullable: true,
  })
  globalLinkConfidence: number | null;

  @ApiProperty({
    description: 'Whether this creditor has unresolved conflicts in the queue',
    example: false,
  })
  hasUnresolvedConflict: boolean;

  @ApiPropertyOptional({
    description: 'Data quality score (0-100)',
    example: 85,
    nullable: true,
  })
  hygieneScore: number | null;

  @ApiPropertyOptional({
    description: 'Industry classification',
    example: 'Banking',
    nullable: true,
  })
  industry: string | null;

  @ApiProperty({
    description: 'Total number of debts from this creditor',
    example: 1523,
  })
  debtCount: number;

  @ApiProperty({
    description: 'Total principal amount of debts',
    example: '2500000.00',
  })
  totalPrincipal: string;

  @ApiPropertyOptional({
    description: 'Notes about this creditor',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Timestamp when creditor was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when creditor was last updated',
    example: '2024-01-20T14:45:00Z',
  })
  updatedAt: Date;

  /**
   * Factory method to create DTO from entity
   */
  static fromEntity(entity: Creditor): CreditorResponseDto {
    const dto = new CreditorResponseDto();
    Object.assign(dto, entity);
    return dto;
  }
}
