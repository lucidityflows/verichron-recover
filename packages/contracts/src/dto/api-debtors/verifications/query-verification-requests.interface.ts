import { VerificationRequestStatus, VerificationType, SortOrder } from '@verichron/enums';

export interface IQueryVerificationRequests {
  verificationType?: VerificationType;
  status?: VerificationRequestStatus;
  requestedAfter?: string;
  requestedBefore?: string;
  sortBy?: string;
  sortDirection?: SortOrder;
  page?: number;
  pageSize?: number;
}
