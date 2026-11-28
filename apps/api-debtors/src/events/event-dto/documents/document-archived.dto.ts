import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentArchivedPayload } from '@verichron/events';

export class DocumentArchivedDto implements DocumentArchivedPayload {
  @IsUUID()
  documentId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  archivedAt: string;

  @IsString()
  @IsNotEmpty()
  archivedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
