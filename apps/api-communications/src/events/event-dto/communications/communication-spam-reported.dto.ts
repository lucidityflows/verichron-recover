import { IsString, IsNotEmpty, IsUUID, IsISO8601 } from 'class-validator';
import type { CommunicationSpamReportedPayload } from '@verichron/events';

export class CommunicationSpamReportedDto implements CommunicationSpamReportedPayload {

  @IsString()
  @IsNotEmpty()
  logId: string;


  @IsUUID()
  @IsNotEmpty()
  organizationId: string;


  @IsUUID()
  @IsNotEmpty()
  debtorId: string;


  @IsISO8601()
  @IsNotEmpty()
  reportedAt: string;
}
