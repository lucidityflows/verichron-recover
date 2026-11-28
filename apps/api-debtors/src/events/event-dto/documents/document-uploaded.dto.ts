import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';
import { DocumentUploadedPayload } from '@verichron/events';
import { DebtorDocumentType } from '@verichron/enums';

export class DocumentUploadedDto implements DocumentUploadedPayload {
  @IsUUID()
  documentId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsEnum(DebtorDocumentType)
  documentType: DebtorDocumentType;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsInt()
  @Min(0)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsDateString()
  uploadedAt: string;

  @IsString()
  @IsNotEmpty()
  uploadedBy: string;
}
