import { IsString, IsNotEmpty, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { CommunicationType, CommunicationProvider } from '@verichron/enums';
import type { CommunicationDispatchedPayload } from '@verichron/events';

/**
 * Event DTO for CommunicationDispatched event
 *
 * Published when a communication is successfully sent to a gateway (SendGrid/Twilio).
 * Indicates the message has been handed off to the provider for delivery.
 */
export class CommunicationDispatchedDto implements CommunicationDispatchedPayload {

  @IsString()
  @IsNotEmpty()
  logId: string;


  @IsUUID()
  @IsNotEmpty()
  organizationId: string;


  @IsUUID()
  @IsNotEmpty()
  debtorId: string;


  @IsEnum(CommunicationType)
  @IsNotEmpty()
  type: CommunicationType;


  @IsString()
  @IsNotEmpty()
  provider: CommunicationProvider;


  @IsString()
  @IsNotEmpty()
  providerMessageId: string;


  @IsDateString()
  @IsNotEmpty()
  dispatchedAt: string;
}
