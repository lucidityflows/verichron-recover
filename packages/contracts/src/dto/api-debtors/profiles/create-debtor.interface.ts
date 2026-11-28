import { DebtorVerificationStatus } from '@verichron/enums';

export interface ICreateDebtor {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  userId?: string;
  verificationStatus?: DebtorVerificationStatus;
  notes?: string;
}
