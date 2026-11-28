import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { PreferenceChannel } from '@verichron/enums';

/**
 * DTO for updating debtor communication preferences
 *
 * All fields are optional to support partial updates.
 */
export class UpdatePreferenceDto {
  @ApiPropertyOptional({
    description: 'Global do not contact flag (overrides all channels)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  doNotContact?: boolean;

  @ApiPropertyOptional({
    description: 'Channels debtor has opted out of',
    example: [PreferenceChannel.SMS],
    type: [String],
    enum: PreferenceChannel,
    enumName: 'PreferenceChannel',
  })
  @IsArray()
  @IsEnum(PreferenceChannel, { each: true })
  @IsOptional()
  optedOutChannels?: PreferenceChannel[];

  @ApiPropertyOptional({
    description: 'Allowed contact start hour (24-hour format, FDCPA: 8am default)',
    example: 8,
    minimum: 0,
    maximum: 23,
  })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  allowedStartHour?: number;

  @ApiPropertyOptional({
    description: 'Allowed contact end hour (24-hour format, FDCPA: 9pm default)',
    example: 21,
    minimum: 0,
    maximum: 23,
  })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  allowedEndHour?: number;

  @ApiPropertyOptional({
    description: 'Maximum communications allowed per day',
    example: 3,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  dailyContactLimit?: number;

  @ApiPropertyOptional({
    description: "Debtor's timezone (IANA timezone string)",
    example: 'America/New_York',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Preferred language for communications (ISO 639-1 code)',
    example: 'en',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'Preferred communication channels (priority order)',
    example: [PreferenceChannel.EMAIL, PreferenceChannel.SMS],
    type: [String],
    enum: PreferenceChannel,
    enumName: 'PreferenceChannel',
  })
  @IsArray()
  @IsEnum(PreferenceChannel, { each: true })
  @IsOptional()
  preferredChannels?: PreferenceChannel[];

  @ApiPropertyOptional({
    description: 'Optional notes about preferences',
    example: 'Debtor prefers email-only communication',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
