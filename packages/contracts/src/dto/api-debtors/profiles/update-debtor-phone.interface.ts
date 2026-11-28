import { PhoneCategory } from '@verichron/enums';

export interface IUpdateDebtorPhone {
  phoneNumber?: string;
  category?: PhoneCategory;
  isPrimary?: boolean;
  canReceiveSms?: boolean;
  canReceiveCalls?: boolean;
  isOptedOut?: boolean;
}
