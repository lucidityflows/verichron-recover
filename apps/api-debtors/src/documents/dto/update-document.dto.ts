import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject, IsBoolean, IsDateString } from 'class-validator';
import { IUpdateDocument } from '@verichron/contracts';

/**
 * DTO for updating document metadata
 *
 * Note: File content cannot be updated. To replace a document,
 * archive the old one and upload a new document.
 */
export class UpdateDocumentDto implements IUpdateDocument {
  @ApiPropertyOptional({
    description: 'Document description',
    example: 'Updated utility bill showing current address',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { expirationDate: '2024-12-31', verifiedBy: 'user-123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Document tags',
    example: ['verified', 'primary-address', '2024'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Document expiration date',
    example: '2024-12-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
