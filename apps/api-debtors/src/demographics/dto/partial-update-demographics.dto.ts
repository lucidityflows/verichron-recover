import { PartialType } from '@nestjs/swagger';
import { UpdateDemographicsDto } from './update-demographics.dto';

/**
 * DTO for partial updates to debtor demographics (PATCH operations)
 *
 * All fields from UpdateDemographicsDto are optional.
 */
export class PartialUpdateDemographicsDto extends PartialType(UpdateDemographicsDto) {}
