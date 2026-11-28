import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { CommunicationDeliveredPayload } from '@verichron/events';
import { CommunicationProvider } from '@verichron/enums';

/**
 * Event DTO for CommunicationDelivered event
 *
 * Published when a gateway confirms successful delivery to recipient.
 * Received via webhook from SendGrid/Twilio.
 */
export class CommunicationDeliveredDto implements CommunicationDeliveredPayload {

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  debtorId: string;


  @IsString()
  @IsNotEmpty()
  logId: string;


  @IsEnum(CommunicationProvider)
  @IsNotEmpty()
  @IsNotEmpty()
  provider: CommunicationProvider;


  @IsDateString()
  @IsNotEmpty()
  deliveredAt: string;


  @IsOptional()
  metadata?: Record<string, any>;
}
