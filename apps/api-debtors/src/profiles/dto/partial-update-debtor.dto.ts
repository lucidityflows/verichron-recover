import { PartialType } from '@nestjs/swagger';
import { UpdateDebtorDto } from './update-debtor.dto';

/**
 * DTO for partial update of a debtor profile
 *
 * Extends UpdateDebtorDto but makes all fields optional
 */
export class PartialUpdateDebtorDto extends PartialType(UpdateDebtorDto) {}
