import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { DebtorVerificationStatus } from '@verichron/enums';
import { ICreateDebtor } from '@verichron/contracts/dist';

/**
 * DTO for creating a new debtor profile
 */
export class CreateDebtorDto implements ICreateDebtor {
  @ApiProperty({
    description: 'Debtor first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Debtor last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    description: 'Debtor middle name',
    example: 'Michael',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({
    description: 'Debtor date of birth in ISO 8601 format',
    example: '1985-06-15',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'User ID if debtor has registered as a platform user',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Verification status of debtor information',
    example: DebtorVerificationStatus.UNVERIFIED,
    enum: DebtorVerificationStatus, enumName: 'DebtorVerificationStatus',
    default: DebtorVerificationStatus.UNVERIFIED,
  })
  @IsEnum(DebtorVerificationStatus)
  @IsOptional()
  verificationStatus?: DebtorVerificationStatus;

  @ApiPropertyOptional({
    description: 'Additional notes about the debtor',
    example: 'Prefers email communication',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

