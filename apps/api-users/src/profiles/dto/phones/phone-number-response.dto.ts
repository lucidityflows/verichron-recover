import { ApiProperty } from '@nestjs/swagger';
import { PhoneCategory } from '@verichron/enums';
import { IUserPhoneNumberResponse } from '@verichron/contracts';

export class PhoneNumberResponseDto implements IUserPhoneNumberResponse {
  @ApiProperty({ description: 'The unique identifier for the phone number record.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'The phone number.', example: '+15551234567' })
  phoneNumber: string;

  @ApiProperty({ description: 'Indicates if this is the user\'s primary phone number.' })
  isPrimary: boolean;

  @ApiProperty({ enum: PhoneCategory, enumName: 'PhoneCategory', description: 'The category of the phone number.' })
  category: PhoneCategory;
}
