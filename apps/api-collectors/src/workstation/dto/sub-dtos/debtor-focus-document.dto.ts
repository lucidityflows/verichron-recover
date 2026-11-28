import { ApiProperty } from '@nestjs/swagger';
import { IDebtorFocusDocument } from '@verichron/contracts';

export class DebtorFocusDocumentDto implements IDebtorFocusDocument {
  @ApiProperty({ description: "Unique identifier for the document", example: 'doc-123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: "Name of the document", example: 'Payment Agreement' })
  name: string;

  @ApiProperty({ description: "Type of the document (e.g., 'pdf', 'jpeg')", example: 'pdf' })
  type: string;

  @ApiProperty({ description: "Timestamp of when the document was uploaded", example: '2023-11-01T10:00:00.000Z' })
  uploadedAt: Date;

  @ApiProperty({ description: "ID of the user who uploaded the document", example: 'user-456' })
  uploadedBy: string;

  @ApiProperty({ description: "URL to access or download the document", example: 'https://example.com/docs/payment_agreement_123.pdf' })
  url: string;

  @ApiProperty({ description: "Optional: ID of the debt related to this document", example: 'debt-789', nullable: true })
  debtId: string | null;
}