import { IsArray, IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { DocumentUpdatedPayload } from '@verichron/events';

export class DocumentUpdatedDto implements DocumentUpdatedPayload {
  @IsUUID()
  documentId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  updatedAt: string;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;

  @IsArray()
  @IsString({ each: true })
  updatedFields: string[];
}
