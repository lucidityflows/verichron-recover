import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { PreferenceChannel } from '@verichron/enums';

/**
 * DTO for opting out of a communication channel
 *
 * Adds the specified channel to the debtor's opted-out channels list.
 * TCPA/FDCPA compliance requires honoring opt-out requests immediately.
 */
export class OptOutDto {
  @ApiProperty({
    description: 'Channel to opt out of',
    example: PreferenceChannel.SMS,
    enum: PreferenceChannel,
    enumName: 'PreferenceChannel',
  })
  @IsEnum(PreferenceChannel)
  @IsNotEmpty()
  channel: PreferenceChannel;

  @ApiPropertyOptional({
    description: 'Optional reason for opt-out (for compliance tracking)',
    example: 'Requested via customer service call',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
