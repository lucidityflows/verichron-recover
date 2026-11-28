import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';
import { IUploadDocument } from '@verichron/contracts';
import { DebtorDocumentType } from '@verichron/enums/dist';

/**
 * DTO for uploading a document
 *
 * Used to provide metadata when uploading a file.
 * The actual file is handled separately via multer interceptor.
 */
export class UploadDocumentDto implements IUploadDocument {
  @ApiProperty({
    description: 'Document type/category',
    example: DebtorDocumentType.PROOF_OF_ADDRESS,
    enum: DebtorDocumentType, enumName: 'DebtorDocumentType',
  })
  @IsEnum(DebtorDocumentType)
  @IsNotEmpty()
  documentType: DebtorDocumentType;

  @ApiPropertyOptional({
    description: 'Optional description of the document',
    example: 'Utility bill from January 2024 showing current address',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['verified', 'primary-address', '2024'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON object',
    example: { expirationDate: '2024-12-31', notes: 'Verified by phone' },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Document expiration date (ISO 8601 format)',
    example: '2024-12-31',
    format: 'date',
  })
  @IsString()
  @IsOptional()
  expiresAt?: string;
}