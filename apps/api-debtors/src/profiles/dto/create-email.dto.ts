import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { ICreateDebtorEmail } from '@verichron/contracts';
import { EmailCategory } from '@verichron/enums/dist';

/**
 * DTO for creating a new email for a debtor
 */
export class CreateEmailDto implements ICreateDebtorEmail {
  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    description: 'Email category',
    example: EmailCategory.GENERAL,
    enum: EmailCategory, enumName: 'EmailCategory',
    default: EmailCategory.GENERAL,
  })
  @IsEnum(EmailCategory)
  @IsOptional()
  emailCategory?: EmailCategory;

  @ApiPropertyOptional({
    description: 'Whether this is the primary email',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}


