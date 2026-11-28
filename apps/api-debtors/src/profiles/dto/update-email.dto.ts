import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { IUpdateDebtorEmail } from '@verichron/contracts';
import { EmailCategory } from '@verichron/enums';

/**
 * DTO for updating an email
 */
export class UpdateEmailDto implements IUpdateDebtorEmail {
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Email category',
    example: EmailCategory.GENERAL,
    enum: EmailCategory, enumName: 'EmailCategory',
  })
  @IsEnum(EmailCategory)
  @IsOptional()
  emailCategory?: EmailCategory;

  @ApiPropertyOptional({
    description: 'Whether this is the primary email',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
