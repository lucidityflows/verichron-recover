import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CreditorConflictStatus, ConflictResolutionAction } from '@verichron/enums';

/**
 * CreditorConflict Entity
 *
 * Represents a pending entity resolution conflict that requires human review.
 * Created when Vertex AI identifies potential matches with medium confidence
 * (70-94%) or when users reject high-confidence suggestions.
 *
 * **Architecture Decision:** Human-in-the-Loop Philosophy
 * - AI suggests, humans decide
 * - No auto-resolution (even at 95%+ confidence)
 * - "Green Strip" UI for bulk approval of high-confidence matches
 *
 * **Four-Tier Confidence System:**
 * - 95-100%: HIGH_CONFIDENCE (Green Strip, bulk approve)
 * - 70-94%:  MEDIUM_CONFIDENCE (Amber Zone, individual review)
 * - 40-69%:  LOW_CONFIDENCE (Red Zone, confirm new creditor)
 * - <40%:    Noise Floor (silent auto-create, no conflict record)
 *
 * **Impact-Based Escalation:**
 * Conflicts affecting more debts are shown first in the queue.
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
@Entity('creditor_conflicts')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'createdAt'])
export class CreditorConflict {
  @ApiProperty({
    description: 'Unique conflict identifier',
    example: 'd1e2f3g4-h5i6-j7k8-l9m0-n1o2p3q4r5s6',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization that owns this conflict. Tenant isolation.',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // ========================================================================
  // UNRESOLVED INPUT
  // ========================================================================

  @ApiProperty({
    description: 'Raw creditor name from import file (before normalization)',
    example: 'JPM Chase, Inc.',
    maxLength: 255,
  })
  @Column({ name: 'raw_creditor_name', type: 'varchar', length: 255 })
  rawCreditorName: string;

  @ApiProperty({
    description: 'Normalized version of raw name (uppercase, no punctuation, no suffixes)',
    example: 'JPM CHASE',
    maxLength: 255,
  })
  @Column({ name: 'normalized_name', type: 'varchar', length: 255 })
  normalizedName: string;

  @ApiProperty({
    description: 'Import job that created this conflict (for traceability)',
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'source_import_id', type: 'uuid', nullable: true })
  sourceImportId: string | null;

  // ========================================================================
  // AI SUGGESTIONS
  // ========================================================================

  @ApiProperty({
    description: 'Array of candidate creditor IDs (org-owned + global creditors)',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'c1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6'],
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @Column({ name: 'suggested_master_ids', type: 'jsonb' })
  suggestedMasterIds: string[];

  @ApiProperty({
    description: 'Confidence scores corresponding to suggested masters (0-100)',
    example: [97.5, 82.3],
    type: 'array',
    items: { type: 'number' },
  })
  @Column({ name: 'confidence_scores', type: 'jsonb' })
  confidenceScores: number[];

  @ApiProperty({
    description: 'Explanation from Vertex AI for top suggestion',
    example: 'EIN exact match + legal entity variation (Inc vs N.A.)',
    nullable: true,
  })
  @Column({ name: 'ai_match_reason', type: 'text', nullable: true })
  aiMatchReason: string | null;

  @ApiProperty({
    description: 'Whether the top suggestion is from platform-verified global_creditors (Gold List)',
    example: true,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'is_platform_match', type: 'boolean', default: false })
  isPlatformMatch: boolean;

  // ========================================================================
  // RESOLUTION STATUS
  // ========================================================================

  @ApiProperty({
    description: 'Conflict status based on confidence tier',
    enum: CreditorConflictStatus,
    example: CreditorConflictStatus.HIGH_CONFIDENCE,
  })
  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: CreditorConflictStatus.MEDIUM_CONFIDENCE,
  })
  status: CreditorConflictStatus;

  @ApiProperty({
    description: 'User who resolved this conflict (approved merge or created new)',
    example: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId: string | null;

  @ApiProperty({
    description: 'Timestamp when conflict was resolved',
    example: '2025-01-15T14:30:00Z',
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @ApiProperty({
    description: 'Resolution action details',
    example: {
      action: ConflictResolutionAction.MERGE,
      targetMasterId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      notes: 'Approved via Green Strip bulk operation',
    },
    nullable: true,
  })
  @Column({ name: 'resolution', type: 'jsonb', nullable: true })
  resolution: {
    action: ConflictResolutionAction;
    targetMasterId?: string;
    targetGlobalId?: string;
    notes?: string;
  } | null;

  // ========================================================================
  // IMPACT TRACKING (for escalation priority)
  // ========================================================================

  @ApiProperty({
    description: 'Number of debts waiting on this conflict resolution (impact-based priority)',
    example: 142,
    type: 'integer',
    default: 0,
  })
  @Column({ name: 'debt_count', type: 'integer', default: 0 })
  debtCount: number;

  @ApiProperty({
    description: 'Total principal amount of debts waiting on this conflict',
    example: 250000.00,
    type: 'number',
    format: 'decimal',
    default: 0,
  })
  @Column({
    name: 'total_principal_affected',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalPrincipalAffected: string;

  // ========================================================================
  // METADATA
  // ========================================================================

  @ApiProperty({
    description: 'Timestamp when conflict was created',
    example: '2025-01-15T10:30:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when conflict was last updated',
    example: '2025-01-15T14:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
