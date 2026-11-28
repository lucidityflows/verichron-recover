import { PhoneCategory } from '@verichron/enums';

export interface IDebtorPhone {
  id: string;
  debtorProfileId: string;
  phoneNumber: string;
  category: PhoneCategory;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  canReceiveSms: boolean;
  canReceiveCalls: boolean;
  isOptedOut: boolean;
  optedOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
