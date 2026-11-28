import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { CommunicationOpenedPayload } from '@verichron/events'; // Import the payload interface

/**
 * Event DTO for EmailOpened event
 *
 * Published when a recipient opens an email (tracking pixel fired).
 * Useful for engagement analytics and follow-up workflows.
 */
export class EmailOpenedDto implements CommunicationOpenedPayload { // Implement the interface

  @IsString()
  @IsNotEmpty()
  logId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string; // Added property

  @IsString()
  @IsNotEmpty()
  debtorId: string; // Added property

  @IsDateString()
  @IsNotEmpty()
  openedAt: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
