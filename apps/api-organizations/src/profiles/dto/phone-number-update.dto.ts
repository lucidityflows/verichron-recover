import { PartialType } from '@nestjs/swagger';
import { CreatePhoneNumberDto } from './phone-number-create.dto';
import { IOrganizationPhoneNumberUpdate } from '@verichron/contracts';

/**
 * DTO for updating an existing organization phone number
 * All fields from create are optional
 */
export class UpdatePhoneNumberDto extends PartialType(CreatePhoneNumberDto) implements IOrganizationPhoneNumberUpdate {}
