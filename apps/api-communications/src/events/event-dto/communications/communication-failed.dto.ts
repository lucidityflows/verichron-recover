import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { CommunicationFailedPayload } from '@verichron/events/dist';
import { CommunicationProvider } from '@verichron/enums/dist';

/**
 * Event DTO for CommunicationFailed event
 *
 * Published when a communication fails either during dispatch or delivery.
 * Includes failure reason and whether the failure is retryable.
 */
export class CommunicationFailedDto implements CommunicationFailedPayload {
  
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  debtorId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  errorCode?: string | undefined;

  @IsBoolean()
  isRetryable: boolean;

  @IsString()
  @IsNotEmpty()
  logId: string;


  @IsString()
  @IsNotEmpty()
  failureReason: string;


  @IsDateString()
  @IsNotEmpty()
  failedAt: string;


  @IsBoolean()
  @IsNotEmpty()
  retryable: boolean;


  @IsString()
  provider: CommunicationProvider;


  @IsOptional()
  metadata?: Record<string, any>;
}
