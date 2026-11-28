import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsPhoneNumber } from 'class-validator';
import { PhoneCategory } from '@verichron/enums';
import { IUserPhoneNumberCreate } from '@verichron/contracts';

export class CreatePhoneNumberDto implements IUserPhoneNumberCreate {
  @ApiProperty({
    description: 'The phone number in E.164 format (e.g., +1 555 123 4567).',
    example: '+15551234567',
  })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber(undefined, { message: 'Invalid phone number format' }) // ← Use built-in validator
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Indicates if this is the user\'s primary phone number.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;

  @ApiPropertyOptional({
    enum: PhoneCategory,
    enumName: 'PhoneCategory',
    description: 'The category of the phone number.',
    default: PhoneCategory.MOBILE,
  })
  @IsEnum(PhoneCategory)
  @IsOptional()
  category?: PhoneCategory = PhoneCategory.MOBILE;
}