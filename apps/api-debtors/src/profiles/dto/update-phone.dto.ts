import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { IUpdateDebtorPhone } from '@verichron/contracts';
import { PhoneCategory } from '@verichron/enums';

/**
 * DTO for updating a phone number
 */
export class UpdatePhoneDto implements IUpdateDebtorPhone {
  @ApiPropertyOptional({
    description: 'Phone number (formatted)',
    example: '+1-555-123-4567',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[\d\s\-\+\(\)]+$/, {
    message: 'Phone number can only contain digits, spaces, dashes, plus signs, and parentheses',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Phone category',
    example: PhoneCategory.MOBILE,
    enum: PhoneCategory, enumName: 'PhoneCategory',
  })
  @IsEnum(PhoneCategory)
  @IsOptional()
  category?: PhoneCategory;

  @ApiPropertyOptional({
    description: 'Whether this is the primary phone number',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this phone can receive SMS messages',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  canReceiveSms?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this phone can receive calls',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  canReceiveCalls?: boolean;

  @ApiPropertyOptional({
    description: 'Whether debtor opted out of communications on this number',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isOptedOut?: boolean;
}
