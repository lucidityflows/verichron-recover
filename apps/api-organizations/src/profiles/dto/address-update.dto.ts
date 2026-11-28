import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './address-create.dto';
import { IOrganizationAddressUpdate } from '@verichron/contracts';

/**
 * DTO for updating an existing organization address
 * All fields from create are optional
 */
export class UpdateAddressDto extends PartialType(CreateAddressDto) implements IOrganizationAddressUpdate {}
