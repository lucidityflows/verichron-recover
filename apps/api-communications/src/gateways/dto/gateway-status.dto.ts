import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatewayHealthDto {
  @ApiProperty({ description: 'Health status', example: 'active' })
  status: string;

  @ApiProperty({ description: 'Integration mode', example: 'sendgrid' })
  mode: string;

  @ApiPropertyOptional({ description: 'Error message if status is failed' })
  error?: string;
}

export class GatewayStatusResponseDto {
  @ApiProperty({ type: GatewayHealthDto })
  email: GatewayHealthDto;

  @ApiProperty({ type: GatewayHealthDto })
  sms: GatewayHealthDto;
}
