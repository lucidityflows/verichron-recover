import { PartialType } from '@nestjs/swagger';
import { CreateGlobalCreditorDto } from './create-global-creditor.dto';
import { IUpdateGlobalCreditor } from '@verichron/contracts';

/**
 * DTO for updating an existing global creditor record.
 * Implements IUpdateGlobalCreditor from @verichron/contracts.
 */
export class UpdateGlobalCreditorDto extends PartialType(CreateGlobalCreditorDto) implements IUpdateGlobalCreditor {}
