import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentGatewayHealthDto {
  @ApiProperty({ description: 'Health status', example: 'active' })
  status: string;

  @ApiProperty({ description: 'Integration mode', example: 'live' })
  mode: string;

  @ApiPropertyOptional({ description: 'Error message if status is failed' })
  error?: string;
}

export class PaymentGatewayStatusResponseDto {
  @ApiProperty({ type: PaymentGatewayHealthDto })
  stripe: PaymentGatewayHealthDto;
}
