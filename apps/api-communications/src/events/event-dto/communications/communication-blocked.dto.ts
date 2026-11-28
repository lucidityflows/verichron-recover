import { IsString, IsNotEmpty, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { DispatchMethod } from '@verichron/enums';
import { CommunicationBlockedPayload } from '@verichron/events';

/**
 * Event DTO for CommunicationBlocked event
 *
 * Published when a compliance rule prevents a communication from being sent.
 * Includes the specific rule that blocked the communication.
 */
export class CommunicationBlockedDto implements CommunicationBlockedPayload {

  @IsString()
  @IsNotEmpty()
  logId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;


  @IsUUID()
  @IsNotEmpty()
  organizationId: string;


  @IsEnum(DispatchMethod)
  @IsNotEmpty()
  type: DispatchMethod;


  @IsString()
  @IsNotEmpty()
  reason: string;


  @IsString()
  @IsNotEmpty()
  ruleName: string;


  @IsDateString()
  @IsNotEmpty()
  blockedAt: string;
}
