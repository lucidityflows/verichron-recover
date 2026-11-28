import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum BusinessEventType {
  PAYMENT = 'payment',
  STATUS_CHANGE = 'status_change',
  PORTFOLIO_UPDATE = 'portfolio_update',
  SYSTEM_UPDATE = 'system_update',
  ACCOUNT_UPDATE = 'account_update',
}

export class BusinessEventDto {
  @ApiProperty({ description: 'Unique event ID', example: 'evt_123456789' })
  @IsString()
  id: string;

  @ApiProperty({ enum: BusinessEventType, description: 'Type of business event' })
  @IsEnum(BusinessEventType)
  type: BusinessEventType;

  @ApiProperty({ description: 'Event title', example: 'Payment Received' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Event description', example: 'Full payment processed for account #12345' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Timestamp when event occurred' })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({ description: 'Optional monetary value associated with event', required: false })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiProperty({ description: 'Optional entity ID (debt, portfolio, user, etc.)', required: false })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ description: 'Additional event metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
