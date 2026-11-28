import { DebtorDocumentType } from '@verichron/enums';

export interface IUploadDocument {
  documentType: DebtorDocumentType;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  expiresAt?: string;
}
