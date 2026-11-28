import { DebtorVerificationStatus } from '@verichron/enums';

export interface IUpdateDebtor {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  userId?: string;
  verificationStatus?: DebtorVerificationStatus;
  notes?: string;
}
