import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for merging a duplicate creditor into a master creditor.
 *
 * Used when:
 * - Admin manually identifies duplicate creditors
 * - User approves an AI-suggested merge from conflict queue
 *
 * Side effects:
 * - Marks duplicate creditor as isMasterRecord=false
 * - Sets duplicate.masterCreditorId to point to master
 * - Reassigns all debts from duplicate to master creditor
 * - Updates master creditor's debtCount and totalPrincipal
 * - Creates audit log entry
 *
 * Notes:
 * - This operation is reversible via "unmerge" (future feature)
 * - organizationId is validated from JWT context
 */
export class MergeCreditorDto {
  @ApiProperty({
    description: 'ID of the master creditor to merge into (target)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'masterCreditorId must be a valid UUID' })
  @IsNotEmpty({ message: 'masterCreditorId is required' })
  masterCreditorId: string;

  @ApiPropertyOptional({
    description: 'Optional notes explaining the merge decision',
    example: 'Approved via Green Strip - EIN exact match + legal entity variation',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
