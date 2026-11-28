import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConflictResolutionAction } from '@verichron/enums';

/**
 * DTO for resolving a creditor conflict.
 *
 * Used in the CreditorResolver UI when:
 * - User approves AI suggestion (MERGE action)
 * - User rejects all suggestions (CREATE_NEW action)
 * - User defers decision (DISMISS action)
 *
 * Resolution workflow:
 * 1. MERGE: Links temp creditor to target master, reassigns debts, marks conflict RESOLVED
 * 2. CREATE_NEW: Converts temp creditor to permanent master, marks conflict RESOLVED
 * 3. DISMISS: Marks conflict as DISMISSED, can be reopened later
 *
 * Notes:
 * - targetMasterId is required for MERGE action
 * - targetGlobalId is optional for linking to global creditor
 * - Creates audit trail with userId, timestamp, notes
 */
export class ResolveConflictDto {
  @ApiProperty({
    description: 'Resolution action type',
    enum: ConflictResolutionAction,
    example: ConflictResolutionAction.MERGE,
  })
  @IsEnum(ConflictResolutionAction, { message: 'action must be a valid ConflictResolutionAction' })
  @IsNotEmpty({ message: 'action is required' })
  action: ConflictResolutionAction;

  @ApiPropertyOptional({
    description: 'ID of the master creditor to merge into (required for MERGE action)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @ValidateIf((o) => o.action === ConflictResolutionAction.MERGE)
  @IsUUID('4', { message: 'targetMasterId must be a valid UUID when action is MERGE' })
  @IsNotEmpty({ message: 'targetMasterId is required when action is MERGE' })
  targetMasterId?: string;

  @ApiPropertyOptional({
    description: 'ID of the global creditor to link (optional, for platform-verified matches)',
    example: 'c1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'targetGlobalId must be a valid UUID' })
  @IsOptional()
  targetGlobalId?: string;

  @ApiPropertyOptional({
    description: 'Optional notes explaining the resolution decision',
    example: 'Approved - Platform verified Gold List match',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
