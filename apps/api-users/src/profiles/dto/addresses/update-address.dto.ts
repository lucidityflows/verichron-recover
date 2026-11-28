import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';
import { IUserAddressUpdate } from '@verichron/contracts';

export class UpdateAddressDto extends PartialType(CreateAddressDto) implements IUserAddressUpdate {}
