import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { PhoneCategory } from '@verichron/enums';
import { IUserPhoneNumberUpdate } from '@verichron/contracts';

export class UpdatePhoneNumberDto implements IUserPhoneNumberUpdate {
  @ApiProperty({
    description: 'Indicates if this is the user\'s primary phone number.',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiProperty({
    enum: PhoneCategory,
    enumName: 'PhoneCategory',
    description: 'The category of the phone number.',
    required: false,
  })
  @IsEnum(PhoneCategory)
  @IsOptional()
  category?: PhoneCategory;
}
