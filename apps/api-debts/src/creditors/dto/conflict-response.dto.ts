import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditorConflictStatus, ConflictResolutionAction } from '@verichron/enums';
import { CreditorConflict } from '../entities/creditor-conflict.entity';

/**
 * DTO for creditor conflict API responses.
 *
 * Maps from CreditorConflict entity to client-friendly response format.
 * Used by:
 * - GET /creditor-conflicts (list)
 * - GET /creditor-conflicts/:id (detail)
 * - POST /creditor-conflicts/:id/resolve (resolve)
 *
 * Notes:
 * - Includes AI suggestions for UI rendering
 * - Includes impact metrics for priority sorting
 * - Can be extended with populated creditor objects
 */
export class ConflictResponseDto {
  @ApiProperty({
    description: 'Unique conflict identifier',
    example: 'd1e2f3g4-h5i6-j7k8-l9m0-n1o2p3q4r5s6',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this conflict',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Raw creditor name from import file',
    example: 'JPM Chase, Inc.',
  })
  rawCreditorName: string;

  @ApiProperty({
    description: 'Normalized version of raw name',
    example: 'JPM CHASE',
  })
  normalizedName: string;

  @ApiPropertyOptional({
    description: 'Import job that created this conflict',
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
    nullable: true,
  })
  sourceImportId: string | null;

  @ApiProperty({
    description: 'Array of candidate creditor IDs',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    type: [String],
  })
  suggestedMasterIds: string[];

  @ApiProperty({
    description: 'Confidence scores for suggested masters (0-100)',
    example: [97.5, 82.3],
    type: [Number],
  })
  confidenceScores: number[];

  @ApiPropertyOptional({
    description: 'Explanation from Vertex AI',
    example: 'EIN exact match + legal entity variation (Inc vs N.A.)',
    nullable: true,
  })
  aiMatchReason: string | null;

  @ApiProperty({
    description: 'Whether top suggestion is from Gold List',
    example: true,
  })
  isPlatformMatch: boolean;

  @ApiProperty({
    description: 'Conflict status based on confidence tier',
    enum: CreditorConflictStatus,
    example: CreditorConflictStatus.HIGH_CONFIDENCE,
  })
  status: CreditorConflictStatus;

  @ApiPropertyOptional({
    description: 'User who resolved this conflict',
    example: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
    nullable: true,
  })
  resolvedByUserId: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when resolved',
    example: '2025-01-15T14:30:00Z',
    nullable: true,
  })
  resolvedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Resolution action details',
    example: {
      action: ConflictResolutionAction.MERGE,
      targetMasterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      notes: 'Approved via Green Strip',
    },
    nullable: true,
  })
  resolution: {
    action: ConflictResolutionAction;
    targetMasterId?: string;
    targetGlobalId?: string;
    notes?: string;
  } | null;

  @ApiProperty({
    description: 'Number of debts waiting on resolution',
    example: 142,
  })
  debtCount: number;

  @ApiProperty({
    description: 'Total principal amount affected',
    example: '250000.00',
  })
  totalPrincipalAffected: string;

  @ApiProperty({
    description: 'Timestamp when conflict was created',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when conflict was last updated',
    example: '2025-01-15T14:30:00Z',
  })
  updatedAt: Date;

  /**
   * Factory method to create DTO from entity
   */
  static fromEntity(entity: CreditorConflict): ConflictResponseDto {
    const dto = new ConflictResponseDto();
    Object.assign(dto, entity);
    return dto;
  }
}
