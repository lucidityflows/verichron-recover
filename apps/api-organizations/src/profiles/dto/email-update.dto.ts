import { PartialType } from '@nestjs/swagger';
import { CreateEmailDto } from './email-create.dto';
import { IOrganizationEmailUpdate } from '@verichron/contracts';

/**
 * DTO for updating an existing organization email
 * All fields from create are optional
 */
export class UpdateEmailDto extends PartialType(CreateEmailDto) implements IOrganizationEmailUpdate {}
