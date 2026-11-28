import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { PreferenceChannel } from '@verichron/enums';

/**
 * DTO for opting in to a communication channel
 *
 * Removes the specified channel from the debtor's opted-out channels list.
 * TCPA requires prior express consent for SMS/calls.
 */
export class OptInDto {
  @ApiProperty({
    description: 'Channel to opt in to',
    example: PreferenceChannel.EMAIL,
    enum: PreferenceChannel,
    enumName: 'PreferenceChannel',
  })
  @IsEnum(PreferenceChannel)
  @IsNotEmpty()
  channel: PreferenceChannel;

  @ApiPropertyOptional({
    description: 'Optional reason for opt-in (for compliance tracking)',
    example: 'Consent provided via web portal',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
