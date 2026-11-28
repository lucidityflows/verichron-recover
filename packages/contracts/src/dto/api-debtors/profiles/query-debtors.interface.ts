import { DebtorVerificationStatus, SortOrder } from '@verichron/enums';

export interface IQueryDebtors {
  firstName?: string;
  lastName?: string;
  verificationStatus?: DebtorVerificationStatus;
  userId?: string;
  organizationId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  hasUserAccount?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'updatedAt';
  sortDirection?: SortOrder
  sortOrder?: SortOrder;
}
