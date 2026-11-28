import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  MaxLength,
  Length,
  IsPositive,
} from 'class-validator';
import {
  Sex,
  Race,
  MaritalStatus,
  EmploymentStatus,
  EducationLevel,
  BankruptcyType,
} from '@verichron/enums';
import { IUpdateDemographics } from '@verichron/contracts/dist';

/**
 * DTO for updating debtor demographics
 *
 * All fields are optional to support partial updates and sparse data scenarios.
 */
export class UpdateDemographicsDto implements IUpdateDemographics {
  // ========== SSN ==========

  @ApiPropertyOptional({
    description: 'Encrypted Social Security Number (will be encrypted by service)',
    example: '123-45-6789',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  ssnEncrypted?: string;

  @ApiPropertyOptional({
    description: 'Last 4 digits of SSN',
    example: '6789',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @IsOptional()
  @Length(4, 4)
  ssnLastFour?: string;

  // ========== Personal Demographics ==========

  @ApiPropertyOptional({
    description: 'Sex/Gender',
    example: Sex.MALE,
    enum: Sex, enumName: 'Sex',
  })
  @IsEnum(Sex)
  @IsOptional()
  sex?: Sex;

  @ApiPropertyOptional({
    description: 'Race/Ethnicity',
    example: Race.WHITE,
    enum: Race, enumName: 'Race',
  })
  @IsEnum(Race)
  @IsOptional()
  race?: Race;

  @ApiPropertyOptional({
    description: 'Marital status',
    example: MaritalStatus.SINGLE,
    enum: MaritalStatus, enumName: 'MaritalStatus',
  })
  @IsEnum(MaritalStatus)
  @IsOptional()
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional({
    description: 'Number of dependents',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  numberOfDependents?: number;

  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'ENGLISH',
    enum: ['ENGLISH', 'SPANISH', 'FRENCH', 'OTHER'],
  })
  @IsEnum(['ENGLISH', 'SPANISH', 'FRENCH', 'OTHER'])
  @IsOptional()
  preferredLanguage?: 'ENGLISH' | 'SPANISH' | 'FRENCH' | 'OTHER';

  // ========== Financial Information ==========

  @ApiPropertyOptional({
    description: 'Annual income in dollars',
    example: 50000,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  annualIncome?: number;

  @ApiPropertyOptional({
    description: 'Employment status',
    example: EmploymentStatus.EMPLOYED_FULL_TIME,
    enum: EmploymentStatus, enumName: 'EmploymentStatus',
  })
  @IsEnum(EmploymentStatus)
  @IsOptional()
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({
    description: 'Employer name',
    example: 'Acme Corporation',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  employerName?: string;

  @ApiPropertyOptional({
    description: 'Occupation or job title',
    example: 'Software Engineer',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({
    description: 'Highest level of education completed',
    example: EducationLevel.BACHELORS_DEGREE,
    enum: EducationLevel, enumName: 'EducationLevel',
  })
  @IsEnum(EducationLevel)
  @IsOptional()
  educationLevel?: EducationLevel;

  // ========== Credit History ==========

  @ApiPropertyOptional({
    description: 'Whether debtor has bankruptcy history',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  bankruptcyHistory?: boolean;

  @ApiPropertyOptional({
    description: 'Date of most recent bankruptcy filing',
    example: '2020-01-15',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  bankruptcyDate?: string;

  @ApiPropertyOptional({
    description: 'Type of bankruptcy filed',
    example: BankruptcyType.CHAPTER_7,
    enum: BankruptcyType, enumName: 'BankruptcyType',
  })
  @IsEnum(BankruptcyType)
  @IsOptional()
  bankruptcyType?: BankruptcyType;

  @ApiPropertyOptional({
    description: 'Bankruptcy discharge date',
    example: '2021-06-15',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  bankruptcyDischargeDate?: string;
}
