import { IsString, IsNotEmpty, IsUUID, IsISO8601, IsOptional } from 'class-validator';
import type { CommunicationClickedPayload } from '@verichron/events';

export class CommunicationClickedDto implements CommunicationClickedPayload {

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
  clickedAt: string;


  @IsString()
  @IsNotEmpty()
  url: string;


  @IsString()
  @IsOptional()
  ipAddress?: string;


  @IsString()
  @IsOptional()
  userAgent?: string;
}
