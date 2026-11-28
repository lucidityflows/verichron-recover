import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentDeletedPayload } from '@verichron/events';

export class DocumentDeletedDto implements DocumentDeletedPayload {
  @IsUUID()
  documentId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  deletedAt: string;

  @IsString()
  @IsNotEmpty()
  deletedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
