import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SandboxCallResponseDto {
  @ApiPropertyOptional({ description: 'Twilio Call SID' })
  sid?: string;

  @ApiPropertyOptional({ description: 'Current call status' })
  status?: string;

  @ApiPropertyOptional({ description: 'Call direction' })
  direction?: string;

  @ApiPropertyOptional({ description: 'Caller number' })
  from?: string;

  @ApiPropertyOptional({ description: 'Recipient number' })
  to?: string;

  @ApiPropertyOptional({ description: 'Whether the call was successful' })
  success?: boolean;

  @ApiPropertyOptional({ description: 'Error message if call failed' })
  error?: string;
}
