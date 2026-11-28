import { DebtorDocumentType, SortOrder } from '@verichron/enums';

export interface IQueryDocuments {
  documentType?: DebtorDocumentType;
  isVerified?: boolean;
  isArchived?: boolean;
  tag?: string;
  includeArchived?: boolean;
  uploadedAfter?: string;
  uploadedBefore?: string;
  expiresAfter?: string;
  expiresBefore?: string;
  sortBy?: string;
  sortDirection?: SortOrder;
  page?: number;
  limit?: number;
}
