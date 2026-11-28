import { PartialType } from '@nestjs/swagger';
import { CreateCreditorDto } from './create-creditor.dto';

/**
 * DTO for updating an existing creditor record.
 *
 * All fields are optional (partial update).
 * Uses PartialType utility from @nestjs/swagger to make all CreateCreditorDto fields optional.
 *
 * Notes:
 * - Cannot update id, organizationId, createdAt, updatedAt (managed by system)
 * - Cannot update isMasterRecord, masterCreditorId (use merge endpoint instead)
 * - Cannot update global linking fields directly (managed by conflict resolution)
 */
export class UpdateCreditorDto extends PartialType(CreateCreditorDto) {}
